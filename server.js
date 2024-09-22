/*
  GNU AGPLv3.0 2023 
  Software: v0.2.0
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
const mssql = require("mssql");

const app = express();
const port = 3001;

// Middleware to parse JSON and URL-encoded data
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/submit-form", (req, res) => {
  console.log("Form submission received"); // Log when the form is received

  const formData = req.body;
  console.log("Form data:", formData); // Log the form data

  emailMessage = formData["userName"] + " has requested to hire kit for " + formData["event"] + " from " + formData["startDate"] + " to " + formData["endDate"] + ".\nThey have provided the following details:\n" + formData["userMessage"] + ".\nYou can contact them at " + formData["userEmail"] + " to confirm the hire.\nTheir school/company is " + formData["company"] + ".\nPostcode: " + formData["userPostCode"] + ".\nPhone: " + formData["userPhone"];
  console.log("Email message:", emailMessage);

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
    to: "dofe@scd.herts.sch.uk",
    subject: "Form Submission",
    text: emailMessage,
  };

  // Sending the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).send(error.toString());
    }
    console.log('Email sent:', info.response);
    return res.status(200).send("Email sent: " + info.response);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

app.get("/", (req, res) => {
  const config = {
    user: "VSC",
    password: "VSC",
    server: "localhost",
    port: 1434,
    database: "kitlogger",
    options: {
      encrypt: false,
      enableArithAbort: true,
      trustServerCertificate: true,
    }
  };

  console.log("Database connection details: ", config);

  mssql.connect(config, function (err) {
    if (err) {
      console.error('Database connection error:', err);
      return res.status(500).send('Database connection error');
    }

    let request = new mssql.Request();

    request.query("SELECT * FROM kit_data", function (err, recordset) {
      if (err) {
        console.error('Query error:', err);
        return res.status(500).send('Query error');
      }

      res.send(recordset);
    });
  });
});