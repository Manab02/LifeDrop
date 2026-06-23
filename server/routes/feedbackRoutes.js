import express from "express";
import Feedback from "../models/feedbackModel.js"; 
const router = express.Router(); 

router.post('/submit', async (req, res) => { 
    try { const { name, email, message } = req.body; 
    if (!name || !email || !message) { 
        return res.json({ success: false, message: 'All fields are required' }); 
    } 
    const feedback = await Feedback.create({ name, email, message }); 
    return res.json({ success: true, message: 'Feedback submitted!', feedback }); 
    } catch (error) { 
        return res.json({ success: false, message: error.message }); 
    } 
}); 
router.get('/all', async (req, res) => { 
    try { const feedbacks = await Feedback.find().sort({ createdAt: -1 }); 
        return res.json({ success: true, feedbacks }); 
    } catch (error) { 
        return res.json({ success: false, message: error.message }); 
    } 
}); 
export default router;