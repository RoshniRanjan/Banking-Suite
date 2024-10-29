const express = require('express');
const bcrypt=require("bcryptjs");
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const router = express.Router();
const userControllers = require("../controllers/user-controller");
const Register = require("../models/register");
const twilio = require('twilio');
const fs = require('fs');
const nodemailer = require('nodemailer');

// Use body-parser to parse form data
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
router.use(bodyParser.json({ limit: '50mb' }));
router.route("/user").get(userControllers.getData);

// Setup memory storage with multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "proavail.service@gmail.com",
    pass: "wtlu geeq avup vnvx"
  },
  debug: true,
});

transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log("ready for messages");
    console.log(success);
  }
});

router.patch('/change-password/:id', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const saltRounds = 10;
  const userId = req.params.id;

  try {
    const user = await Register.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    if (!user.login_details || !user.login_details.password) {
      return res.status(400).send('User has no password set');
    }

    const passMatch = await bcrypt.compare(oldPassword, user.login_details.password);
    
    if (passMatch) {
      const hashPassword = await bcrypt.hash(newPassword, saltRounds);
      const updatedUser = await Register.findByIdAndUpdate(
        userId,
        { $set: { 'login_details.password': hashPassword } },
        { new: true } // Return the updated document
      );

      if (!updatedUser) {
        return res.status(404).send('User not updated');
      }

      res.status(200).json(updatedUser);
    } else {
      res.status(400).send('Old password does not match');
    }
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error');
  }
});

router.patch('/forgot-password', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await Register.findOne({ 'contact.email': email });
    const saltRounds=10;

    if (!user) {
      return res.status(404).send('User not found');
    } else {
      const hash_password = await bcrypt.hash(password, saltRounds);
      const updatedUser = await user.updateOne(
        { $set: { 'login_details.password': hash_password } },
        { new: true } // Return the updated document
      );

      if (!updatedUser) {
        return res.status(404).send('User not found');
      }

      res.status(200).json(updatedUser);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

router.post('/login',async(req,res)=>{
  const {email,password}=req.body;
  const saltRounds = 10;
  try {
    const user = await Register.findOne({ 'contact.email': email });

    if (!user) {
      return res.status(404).send('User not found');
    }
    else
    {
      const passmatch=bcrypt.compare(password,user.login_details.password);
      if(passmatch)
      {
        res.status(200).json({msg:"Login Successful", id:user._id});
      }
    }
  }
  catch(error)
  {
    console.log(error)
  }

})



router.route('/verify-email').post(async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000);

  try
  {
    const user = await Register.findOne({ 'contact.email': email });

    if (!user) {
      return res.status(404).send('User not found');
    }
    else
    {
      const mailOptions = {
        from: "proavail.service@gmail.com",
        to: email,
        subject: "Email Verification",
        html: `<p><b>Your otp is:</b>${otp}</p>
               <p>Thank You</p>`
      };
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.response);
        res.json({ success: true, message: 'OTP sent successfully.', otp: otp });
      } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send("Internal Server Error");
      }

    }

  }
  catch(error)
  {
   console.log(error)
  }
  
});



router.patch('/loginDetails/:id', async (req, res) => {
  const { login_details } = req.body;
  const userId = req.params.id;
  const { username, password } = login_details;
  const saltRounds = 10;

  try {
    // Hash the password securely
    const hash_password = await bcrypt.hash(password, saltRounds);

    // Prepare updated info object
    const updatedInfo = {
      username: username,
      password: hash_password,
    };

    // Update user in the database
    const updatedUser = await Register.findByIdAndUpdate(
      userId,
      { $set: { login_details: updatedInfo } },
      { new: true } // Return the updated document
    );

    // Handle if user is not found
    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    // Send the updated user object in the response
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');

  }
  
});

router.post('/user/:id/transactions', async (req, res) => {
   // Replace with your user ID or fetch dynamically
   const userId=req.params.id;
  const { name, transaction_type, amount } = req.body;
  const xamount=parseFloat(amount);

  try {
    // Fetch user from database
    let user = await Register.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update balance based on transaction type
    if (transaction_type === 'withdraw') {
      user.balance -= xamount;
    } else if (transaction_type === 'deposit') {
      user.balance += xamount;
    } else {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    // Save updated user balance
    await user.save();

    // Create transaction record
    user.transactions.push({
      name,
      transaction_type,
      amount:xamount,
      updated_balance: user.balance
    });

    // Save user with updated transaction history
    await user.save();

    // Respond with success message
    res.status(200).json({ message: 'Transaction added successfully', user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
router.get('/user/:id/balance', async (req, res) => {
  const userId = req.params.id;

  try {
    // Fetch user from database by ID
    const user = await Register.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract initial_balance and balance from user object
    const { initial_balance, balance, email } = user;

    // Send initial_balance and balance to the frontend
    res.json({ initial_balance, balance, email });

  } catch (error) {
    console.error('Error fetching user balance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
// Route handler to send statement PDF via email

router.post('/send-statement', upload.single('pdfFile'), async (req, res) => {
  const { to, subject, text } = req.body;
  const pdfFile = req.file;

  if (!pdfFile) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Create PDF attachment
    const attachment = {
      filename: pdfFile.originalname,
      content: pdfFile.buffer
    };

    // Send email with attachment
    const info = await transporter.sendMail({
      from: "proavail.service@gmail.com",
      to,
      subject,
      text,
      attachments: [attachment]
    });

    console.log('Email sent:', info.messageId);
    res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

router.get('/info/:id', async (req, res) => {
  const userId = req.params.id
  try {
    const user = await Register.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
    


  }
  catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server Error' });
  }

})

router.get('/user/:id/transaction', async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await Register.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Assuming 'transactions' is an array field in your 'Register' schema
    const transactions = user.transactions;

    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});


router.patch('/update/:id', async (req, res) => {
  const userId = req.params.id;
  const updatedInfo = req.body;

  try {
    const updatedUser = await Register.findByIdAndUpdate(
      userId,
      { $set: updatedInfo },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});


router.route("/user").post(async (req, res) => {
  console.log(req.body);
  const { personal, address } = req.body;

  const newUser = new Register({
    personal,
    address,
  });

  try {
    const savedUser = await newUser.save();
    res.status(201).send({ id: savedUser._id });
  } catch (error) {
    res.status(400).send(error);
  }
});

router.route('/user/:id').patch(async (req, res) => {
  const updates = req.body;

  try {
    const user = await Register.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).send();
    }

    res.send(user);
  } catch (error) {
    res.status(400).send(error);
  }
});

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

router.route("/send-otp").post(async (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000);

  client.messages
    .create({
      body: `Your OTP for verification is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: '+91' + phone
    })
    .then(message => {
      console.log(message.sid);
      res.json({ success: true, message: 'OTP sent successfully.', otp: otp });
    })
    .catch(error => {
      console.error(error);
      res.json({ success: false, message: 'Failed to send OTP.' });
    });
});

router.route('/send-email').post(async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000);
  const mailOptions = {
    from: "proavail.service@gmail.com",
    to: email,
    subject: "Email Verification",
    html: `<p><b>Your otp is:</b>${otp}</p>
           <p>Thank You</p>`
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    res.json({ success: true, message: 'OTP sent successfully.', otp: otp });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post('/document-upload', upload.fields([{ name: 'aadhaar', maxCount: 1 }, { name: 'pan', maxCount: 1 }]), (req, res) => {
  const userId = req.body.userId;
  const aadhaarFile = req.files['aadhaar'][0];
  const panFile = req.files['pan'][0];

  if (!aadhaarFile || !panFile) {
    return res.status(400).send('Please upload both Aadhaar Card and PAN Card.');
  }

  const userUploadsDir = path.join(__dirname, `../uploads/${userId}`);
  fs.mkdirSync(userUploadsDir, { recursive: true });

  const aadhaarPath = path.join(userUploadsDir, `${Date.now()}-${aadhaarFile.originalname}`);
  const panPath = path.join(userUploadsDir, `${Date.now()}-${panFile.originalname}`);

  fs.writeFileSync(aadhaarPath, aadhaarFile.buffer);
  fs.writeFileSync(panPath, panFile.buffer);

  Register.findByIdAndUpdate(userId, {
    aadhaarFile: aadhaarPath,
    panFile: panPath
  }, { new: true })
    .then((updatedUser) => {
      res.status(200).send('Files uploaded and information stored successfully.');
    })
    .catch((error) => {
      console.error('Error updating user information in MongoDB:', error);
      res.status(500).send('Error updating user information in MongoDB.');
    });
});

module.exports = router;
