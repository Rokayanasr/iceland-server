const nodeMailer = require("nodemailer");
const express = require("express");
const path = require("path");
const app = express();
require("dotenv").config();
const multer = require("multer");
const cors = require("cors");
// middlewares
app.use(cors());
app.use(express.static("puplic"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname + "public")));

// multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public");
    },
    filename: function (req, file, cb) {
        const fileName = `${Date.now()}_${file.originalname}`;
        req.savedFileName = fileName;
        cb(null, fileName);
    },
});
const uploads = multer({ storage });

app.post("/send-email", uploads.single("image"), async (req, res) => {
    const imageUrl = req.savedFileName;
    if (!imageUrl) {
        throw new Error("Image not uploaded correctly.");
    }
    const { firstName, lastName, serviceName, phone, email } = req.body;
    const html = `
    <h2>الاسم: ${firstName} ${lastName} </h2>
    <h4>الخدمة:  ${serviceName}</h4>
    <h4>رقم الهاتف:  ${phone}</h4>
    <img src="cid:${imageUrl}" width="400"/>
    `;

    try {
        const transporter = nodeMailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            // secure: true,
            service: "gmail",
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            },
            secureConnection: false,
        });

        const mailOption = {
            from: email,
            to: "maramiceland2023@gmail.com",
            subject: serviceName,
            html: html,
            attachments: [
                {
                    filename: imageUrl,
                    path: path.join(__dirname, "public", imageUrl),
                    cid: imageUrl,
                },
            ],
        };

        const info = await transporter.sendMail(mailOption);
        console.log("Email has been sent successfully" + info.messageId);
        res.send("Email has been sent successfully");
    } catch (err) {
        console.log("Email could not be sent due to error: " + err);
        res.send("Email could not be sent due to error: " + err);
    }
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
