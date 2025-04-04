import dotenv from "dotenv"
import connectDB from "./db/index.js"
import {app} from './app.js'
 
dotenv.config({ path: "../.env" });
// console.log("MongoDB URI:", process.env.MONGODB_URI);


connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () =>{
console.log(`server is runnig at port ${process.env.PORT}`);


    })
})
.catch((err) => {
    console.log("mongodb connection failed", err);
    
})



/*(async () => {
try{
await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

app.on("error", (error) => {
    console.log("ERROR", (error));
    throw error
    
})

app.listen(process.env.PORT, () => {
    console.log(`App is listening on port ${process.env.PORT}`);
    
})
}catch(error) {
    console.error("ERROR: ", error)
    throw err
    
}



})()*/