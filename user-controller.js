const user=require("../models/register")
const getData=async(req,res)=>{
    const myData=await user.find({})
    res.status(200).json({myData})
}

module.exports={getData};