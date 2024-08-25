const nodeMailer = require("nodemailer");
const express = require("express");
const path = require("path");
const app = express();
require("dotenv").config();
const cloudinary = require('./cloudinary/cloudinary');
const cors = require("cors");
const multer = require("multer");
const sharp = require("sharp");

// middlewares
app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تكوين multer لتخزين الملفات في الذاكرة
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post("/send-email", upload.single('image'), async (req, res) => {
    try {
        const { firstName, lastName, serviceName, phone, email } = req.body;

        // التحقق من وجود جميع الحقول
        const missingFields = [];
        if (!firstName) missingFields.push('الاسم الأول');
        if (!lastName) missingFields.push('الاسم الأخير');
        if (!serviceName) missingFields.push('اسم الخدمة');
        if (!phone) missingFields.push('رقم الهاتف');
        if (!email) missingFields.push('البريد الإلكتروني');

        if (missingFields.length > 0) {
            return res.status(400).send(`الحقول التالية مفقودة: ${missingFields.join(', ')}`);
        }

        // التحقق من وجود صورة في الطلب
        if (!req.file) {
            return res.status(400).send('لم يتم رفع أي صورة.');
        }

        // ضغط الصورة باستخدام sharp
        const compressedImageBuffer = await sharp(req.file.buffer)
            .resize({ width: 800 }) // تغيير حجم الصورة إذا لزم الأمر
            .jpeg({ quality: 80 }) // ضغط الصورة بنسبة جودة 80
            .toBuffer();

        // رفع الصورة إلى Cloudinary
        const result = await cloudinary.uploader.upload_stream({
            resource_type: 'image',
            folder: 'images', // يمكنك تحديد مجلد لتخزين الصور
        }, (error, result) => {
            if (error) {
                console.log("Error uploading image to Cloudinary: ", error);
                res.status(500).send("Error uploading image to Cloudinary.");
            } else {
                const imageUrl = result.secure_url;

                // إعداد بريد إلكتروني
                const html = `
                    <h2>الاسم: ${firstName} ${lastName}</h2>
                    <h4>الخدمة: ${serviceName}</h4>
                    <h4>رقم الهاتف: ${phone}</h4>
                    <img src="${imageUrl}" width="400"/>
                `;

                // إعداد Nodemailer
                const transporter = nodeMailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.GMAIL_USER,
                        pass: process.env.GMAIL_PASS
                    }
                });

                const mailOptions = {
                    from: email,
                    to: 'rokanasr60@gmail.com',
                    subject: `طلب خدمة: ${serviceName}`,
                    html: html
                };

                // إرسال البريد الإلكتروني
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log("Email could not be sent due to error: " + error);
                        res.status(500).send("Email could not be sent due to error: " + error);
                    } else {
                        console.log("Email has been sent successfully: " + info.messageId);
                        res.status(200).send("Email has been sent successfully");
                    }
                });
            }
        }).end(compressedImageBuffer); // نرسل الصورة المضغوطة إلى Cloudinary

    } catch (err) {
        console.error("تعذر إرسال البريد الإلكتروني بسبب الخطأ: " + err);
        res.status(500).send("تعذر إرسال البريد الإلكتروني بسبب الخطأ: " + err);
    }
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
