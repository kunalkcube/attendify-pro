import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    googleId: String,
    displayName: String,
    email: String,
    phone: String,
    role: String,
    rollNo: String,
    registrationNo: String,
    secretKey: String,
    profilePic: String,
});

const User = mongoose.model('User', userSchema);

export default User;
