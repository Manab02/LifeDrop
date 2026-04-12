import mongoose from "mongoose";

const connetDB = async () => {

    mongoose.connection.on('connected', () => console.log("Database Connected"));    //()=> is call back function called 

    await mongoose.connect(process.env.MONGODB_URI);;
};
export default connetDB;