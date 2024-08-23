/*
  GNU AGPLv3.0 2023 
  Software: v0.0.14
  Kit Logger - DofE Kit Management System
  Copyright (C) 2023 Thomas Kirby

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.
  
  You should have received a copy of the GNU General Public License
  along with this program [LICENSE.txt].  If not, see <https://www.gnu.org/licenses/>.
*/
// Importing required modules
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");

// Setting up the app
const app = express();
const port = 3000;

// Using body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(cors()); // Enable CORS

// Defining the route for the root URL
app.post("/submit-form", (req, res) => {
  console.log("Form submission received"); // Log when the form is received

  const formData = req.body;
  console.log("Form data:", formData); // Log the form data

  // Creating a transporter object using SMTP transport
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'noreply.kitlogger@gmail.com', // Sender's email
      pass: 'krwg eyqp qlhq ioln', // Email account app password
    },
  });

  // Defining the email options
  let mailOptions = {
    from: "noreply.kitlogger@gmail.com",
    to: "tomkirby314@gmail.com",
    subject: "Form Submission",
    text: `Form Data: ${JSON.stringify(formData)}`,
  };

  // Sending the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).send(error.toString());
    }
    console.log('Email sent:', info.response);
    res.status(200).send("Email sent: " + info.response);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
