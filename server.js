/*
  GNU AGPLv3.0 2023 
  Software: v0.3.3
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

/*
  mint-cricket-rare.ngrok-free.app > permanent URL of server when running ngrok start --all
*/

// Functions
function getKitDataByID(records) {
  records.recordset.forEach(function (record) {
    console.log(record);
  });
  console.log(records.recordset.length);
}

function writeKitData(request, writeQuery) {
  var query = `
    INSERT INTO kit_data(
      contents_of_qr_code, status, category, manufacturer, attribute_brand, 
      attribute_color, attribute_size, is_a_set, number_in_set, 
      number_present_in_set, purchased_date, purchased_value, purchased_from, 
      next_inspection_date, last_inspection_date, working_life_in_years, 
      retirement_date, on_loan, notes
    ) VALUES `;

  for (let i = 0; i < writeQuery.length; i++) {
    query += `('${writeQuery[i].join("', '")}')`;
    if (i < writeQuery.length - 1) {
      query += ", ";
    }
  }

  query += ";";

  request.batch(query, (err, result) => {
    if (err) {
      console.error("Error:", err);
    } else {
      console.log("Result:", result);
    }
  });
}

/*    
function checkLoginData(request, username, password) {
  request.query("SELECT * FROM login", function (err, recordset) {
    if (err) {
      console.error('Query error:', err);
      return res.status(500).send('Query error');
    }      

    const loginData = recordset.recordset;
    for (let i = 0; i < loginData.length; i++) {
      if (loginData[i].username === username && loginData[i].password_hash === password) {
        console.log("Login successful");
        console.log("User ID:", loginData[i].uid);
        request.query("SELECT * FROM kit_hire WHERE user_id = " + loginData[i].uid, function (err, recordset) {
          if (err) {
            console.error('Query error:', err);
            return res.status(500).send('Query error');
          }
          //data = recordset.recordset[0].loan_start_date;
          console.log("Kit hire data:", recordset.recordset[0]);
        });
        return "Login successful";
      }
    }
    console.log("Login failed");
  });
}*/

function encryptPassword(password) {
  const saltRounds = 10;
  const hash = bcrypt.hashSync(password, saltRounds);
  return hash;
}

function verifyPassword(password, storedHash) {
  return bcrypt.compareSync(password, storedHash);
}

//Page authentication
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    console.log("User is authenticated");
    return next();
  } else {
    console.log("User is not authenticated");
    res.status(401).send("Unauthorized");
  }
}

const formData = [
  [
    "SCD-ST-L35",
    "Missing",
    "Rucksacks",
    "Endurance",
    "Mission 65",
    "Red",
    "65",
    0,
    0,
    0,
    "2018-08-01",
    "121.56",
    "Endurance",
    "2024-01-10",
    "2021-01-10",
    10,
    "2000-01-01",
    0,
    "",
  ],
  [
    "SCD-ST-L36",
    "Available",
    "Stoves",
    "Trangia",
    "Trangia 25-2/UL",
    "Silver",
    "M",
    0,
    0,
    0,
    "2019-08-01",
    "130.00",
    "Trangia",
    "2025-01-10",
    "2022-01-10",
    10,
    "2001-01-01",
    0,
    "",
  ],
];

// Importing required modules
const express = require("express"); // Express module
const session = require("express-session"); // Session module
const bodyParser = require("body-parser"); // Body parser module
const nodemailer = require("nodemailer"); // Email module
const cors = require("cors"); // Cross-origin resource sharing module
const mssql = require("mssql"); // Database connection module
const bcrypt = require("bcrypt"); // Password hashing module
const QrScanner = require("qr-scanner"); // QR code scanner module
const fileUpload = require("express-fileupload"); // File upload module
const fs = require("fs"); // File system module
const csv = require("csv-parser"); // CSV parser module
const path = require("path"); // Path module

// Setting up the server
const app = express();
const port = 3003;

// Defining the database connection details
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
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Middleware to parse JSON and URL-encoded data
app.use(cors());
app.use(fileUpload());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "$dj2!4$fnien.kfio-4547%fea", // Secret key for session
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }, // Set to true if using HTTPS
  })
);

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
};

const formatDate = (dateString) => {
  if (!dateString || dateString === "NULL") return null;
  const [year, month, day] = dateString.split("-");
  return `${year}-${month}-${day}`;
};

const getConnection = async (retries = 5) => {
  while (retries) {
    try {
      const pool = await mssql.connect(config);
      return pool;
    } catch (err) {
      console.error("Database connection error:", err);
      retries -= 1;
      console.log(`Retries left: ${retries}`);
      if (!retries) throw err;
      await new Promise((res) => setTimeout(res, 5000)); // Wait 5 seconds before retrying
    }
  }
};

// Handle form submissions
app.post("/submit-form", (req, res) => {
  console.log("Form submission received"); // Log when the form is received

  const formData = req.body;
  console.log("Form data:", formData); // Log the form data

  emailMessage =
    formData["userName"] +
    " has requested to hire kit for " +
    formData["event"] +
    " from " +
    formData["startDate"] +
    " to " +
    formData["endDate"] +
    ".\nThey have provided the following details:\n" +
    formData["userMessage"] +
    ".\nYou can contact them at " +
    formData["userEmail"] +
    " to confirm the hire.\nTheir school/company is " +
    formData["company"] +
    ".\nPostcode: " +
    formData["userPostCode"] +
    ".\nPhone: " +
    formData["userPhone"];
  console.log("Email message:", emailMessage);

  // Defining the email options
  const mailOptions = {
    from: "noreply.kitlogger@gmail.com",
    to: "dofe@scd.herts.sch.uk",
    subject: "Form Submission",
    text: emailMessage,
  };

  // Creating a transporter object using SMTP transport
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "noreply.kitlogger@gmail.com", // Sender's email
      pass: "krwg eyqp qlhq ioln", // Email account app password
    },
  });

  // Sending the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      return res.status(500).send(error.toString());
    }
    console.log("Email sent:", info.response);
    return res.status(200).send("Email sent: " + info.response);
  });
});

// Handle fetching data from the database
app.get("/fetch-data", async (req, res) => {
  try {
    const pool = await getConnection();
    console.log("Database connection established");

    const request = pool.request();
    request.input("category", mssql.VarChar, "Rucksacks");
    const result = await request.query(
      "SELECT * FROM kit_data ORDER BY id ASC"
    );

    res.send(result.recordset); // Send the recordset to the client
    console.log(result.recordset.length); // Log the number of records
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).send("Query error");
  }
});

// Handle Search
app.get("/search-data", async (req, res) => {
  const searchRequest = req.query.search; // Get the search query parameter
  const category = req.query.category;

  console.log("Search request:", searchRequest);
  console.log("Category:", category);

  if (!searchRequest || !category) {
    return res.status(400).send("Search query and category are required");
  }

  try {
    const pool = await getConnection();
    console.log("Database connection established");

    const request = pool.request();
    request.input("searchRequest", mssql.VarChar, `%${searchRequest}%`);
    const query = `SELECT * FROM kit_data WHERE ${category} LIKE @searchRequest`;
    const result = await request.query(query);

    res.send(result.recordset);
  } catch (err) {
    console.error("DB Query error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/kit-analysis", async (req, res) => {
  try {
    const pool = await getConnection();
    console.log("Database connection established");

    const request = pool.request();
    const allItems = await request.query("SELECT * FROM kit_data");
    const onLoanItems = await request.query(
      "SELECT * FROM kit_data WHERE on_loan = '1'"
    );
    const availableItems = await request.query(
      "SELECT * FROM kit_data WHERE status = 'available'"
    );
    const missingItems = await request.query(
      "SELECT * FROM kit_data WHERE status = 'missing'"
    );

    const result = await Promise.all([
      allItems.recordset.length,
      onLoanItems.recordset.length,
      availableItems.recordset.length,
      missingItems.recordset.length,
    ]);
    console.log(result);

    res.json(result);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).send("Query error");
  }
});

app.get("/kit-analysis-by-category", async (req, res) => {
  const category = req.query.category;

  if (!category) {
    return res.status(400).send("Category is required");
  }

  try {
    const pool = await getConnection();
    console.log("Database connection established");

    const request = pool.request();
    request.input("category", mssql.VarChar, `%${category}%`);
    const allItems = await request.query(
      "SELECT * FROM kit_data WHERE category LIKE @category"
    );
    const onLoanItems = await request.query(
      "SELECT * FROM kit_data WHERE category LIKE @category AND on_loan = '1'"
    );
    const availableItems = await request.query(
      "SELECT * FROM kit_data WHERE category LIKE @category AND status = 'available'"
    );
    const missingItems = await request.query(
      "SELECT * FROM kit_data WHERE category LIKE @category AND status = 'missing'"
    );

    const result = await Promise.all([
      allItems.recordset.length,
      onLoanItems.recordset.length,
      availableItems.recordset.length,
      missingItems.recordset.length,
    ]);
    console.log(result);

    res.json(result);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).send("Query error");
  }
});

// Handle login form submissions
app.post("/submit-login-form", async (req, res) => {
  console.log("Form submission received"); // Log when the form is received

  const loginFormData = req.body;
  //console.log("Form data:", loginFormData); // Log the form data

  const username = loginFormData["uname"];
  const password = loginFormData["psw"];

  console.log(encryptPassword(password));

  try {
    const pool = await getConnection();
    console.log("Database connection established");

    const request = pool.request();
    request.input("username", mssql.VarChar, username);
    const result = await request.query(
      "SELECT * FROM login WHERE username = @username"
    );

    if (result.recordset.length === 0) {
      console.log("Login failed: User not found");
      return res.status(401).send("Login failed");
    }

    const loginData = result.recordset[0];
    const storedHash = loginData.password_hash;

    //console.log(encryptPassword(password));
    //console.log(verifyPassword(password, loginData[0].password_hash))
    //console.log(loginData[0].username);
    if (verifyPassword(password, storedHash)) {
      console.log("Login successful");
      console.log("User ID:", loginData.uid);
      req.session.userId = loginData.uid; // Store user ID in session
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).send("Session save error");
        }
        return res.status(200).send(loginData);
      });
    } else {
      console.log("Login failed: Incorrect password");
      return res.status(401).send("Login failed");
    }
  } catch (err) {
    console.log("Login failed", err);
    return res.status(500).send("Server Error");
  }
});

/*
// Handle form submissions
app.post("/submit-form", (req, res) => {
  console.log("Form submission received"); // Log when the form is received

  const formData = req.body;
  console.log("Form data:", formData); // Log the form data

  emailMessage = formData["userName"] + " has requested to hire kit for " + formData["event"] + " from " + formData["startDate"] + " to " + formData["endDate"] + ".\nThey have provided the following details:\n" + formData["userMessage"] + ".\nYou can contact them at " + formData["userEmail"] + " to confirm the hire.\nTheir school/company is " + formData["company"] + ".\nPostcode: " + formData["userPostCode"] + ".\nPhone: " + formData["userPhone"];
  console.log("Email message:", emailMessage);

  // Defining the email options
  const mailOptions = {
    from: "noreply.kitlogger@gmail.com",
    to: "dofe@scd.herts.sch.uk",
    subject: "Form Submission",
    text: emailMessage,
  };

  // Creating a transporter object using SMTP transport
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'noreply.kitlogger@gmail.com', // Sender's email
      pass: 'krwg eyqp qlhq ioln', // Email account app password
    },
  });

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

// Handle fetching data from the database
app.get("/fetch-data", (req, res) => {
  const request = new mssql.Request(); // Create a new request object

  request.query("SELECT * FROM kit_data ORDER BY contents_of_qr_code ASC", function (err, recordset) { // Query the database
    if (err) { // Handle query errors
      console.error('Query error:', err);
      return res.status(500).send('Query error'); // Send an error response
    }

    res.send(recordset.recordset); // Send the recordset to the client
    console.log(recordset.recordset.length); // Call the function to log the records
    //writeKitData(request, formData);
  });
});

// Handle Search
app.get("/search-data", (req, res) => {
  const searchRequest = req.query.search; // Get the search query parameter
  const category = req.query.category;

  console.log('Search request:', searchRequest);
  console.log('Category:', category);

  if (!searchRequest || !category) {
    return res.status(400).send('Search query is required');
  }
  
  const request = new mssql.Request();
  const query = `DECLARE @searchRequest VARCHAR(255) = '%${searchRequest}%'; SELECT * FROM kit_data WHERE ${category} LIKE @searchRequest;`;
  request.query(query, function (err, result) {
    if (err) {
      console.error('Query error:', err);
      return res.status(500).send('Query error');
    }

    res.send(result.recordset);
  });
});
*/
app.get("/kit-analysis", (req, res) => {
  const request = new mssql.Request();
  const onLoanItems = request.query(
    "SELECT * FROM kit_data WHERE on_loan = '1'"
  );
  const availableItems = request.query(
    "SELECT * FROM kit_data WHERE status = 'available'"
  );
  const missingItems = request.query(
    "SELECT * FROM kit_data WHERE status = 'missing'"
  );

  const result = Promise.all([onLoanItems, availableItems, missingItems]);
  console.log(result);

  res.send(result);
});

app.post("/assign-kit", async (req, res) => {
  const data = req.body;
  console.log(data);
  if (!data.key) {
    return res.status(400).send({ error: "Key is required" });
  }

  try {
    const pool = await getConnection();
    console.log("Database connection established");

    const assignedKit = [];

    const assignItem = async (type, size) => {
      const request = pool.request();
      request.input("type", mssql.VarChar, type);
      request.input("size", mssql.VarChar, size);
      request.input("key", mssql.VarChar, data.key);

      const query1 = `
        SELECT uid
        FROM login
        WHERE login.encrypt_key = @key`;
      const uid = await request.query(query1);
      console.log(uid.recordset[0].uid);
      request.input("uid", mssql.Int, uid.recordset[0].uid);
      const result = await request.query(`
        SELECT TOP 1 * FROM kit_data 
        WHERE category = @type AND attribute_size = @size AND status = 'Available'
      `);
      console.log(result);

      if (result.recordset.length === 0) {
        return null;
      }

      const item = result.recordset[0];

      await request.query(`
        UPDATE kit_data 
        SET status = 'On Loan', on_loan = 1 
        WHERE id = ${item.id}
      `);

      await request.query(`
        INSERT INTO kit_hire (kit_id1, user_id) 
        VALUES (${item.id}, @uid)
      `);
      console.log("Kit assigned:", item.contents_of_qr_code);
      assignedKit.push({ type, qrCode: item.contents_of_qr_code });
    };

    if (data.rucksack) await assignItem("Rucksacks", data.rucksackSize);
    if (data.sleepingBag) await assignItem("Sleeping Bag", null);
    if (data.sleepingMat) await assignItem("Sleeping Mat", null);
    if (data.boots) await assignItem("Boots", data.bootsSize);
    if (data.waterproofs) await assignItem("Waterproofs", null);

    res.json({ assignedKit });
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/get-user-details", async (req, res) => {
  const key = req.query.key;

  if (!key) {
    return res.status(400).send("Key is required");
  }

  try {
    const pool = await getConnection();
    console.log("Database connection established");

    const request = pool.request();
    request.input("key", mssql.VarChar, key);
    const query = `
      SELECT 
        login.username, 
        login.group_id, 
        login.exped_level, 
        groups.group_level,
        groups.group_size, 
        kit_data.contents_of_qr_code AS group_tent_1,
        kit_data.contents_of_qr_code AS group_tent_2,
        kit_data.contents_of_qr_code AS group_tent_3,
        kit_data.contents_of_qr_code AS group_stove_1,
        kit_data.contents_of_qr_code AS group_stove_2
      FROM 
        login
      JOIN 
        groups ON login.group_id = groups.group_id 
      LEFT JOIN 
        kit_data ON kit_data.id IN (groups.group_tent_1, groups.group_tent_2, groups.group_tent_3, groups.group_stove_1, groups.group_stove_2)
      WHERE 
        login.encrypt_key = @key
    `;
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).send("User not found");
    }

    const userData = result.recordset[0];

    const response = {
      name: userData.username,
      groupNumber: userData.group_id,
      expeditionLevel: userData.exped_level,
      groupLevel: userData.group_level,
      groupSize: userData.group_size,
    };

    if (userData.group_tent_1)
      response.groupTent1 = userData.group_tent_1.slice(-3);
    if (userData.group_tent_2)
      response.groupTent2 = userData.group_tent_2.slice(-3);
    if (userData.group_tent_3)
      response.groupTent3 = userData.group_tent_3.slice(-3);
    if (userData.group_stove_1)
      response.groupStove1 = userData.group_stove_1.slice(-3);
    if (userData.group_stove_2)
      response.groupStove2 = userData.group_stove_2.slice(-3);

    console.log(response);
    res.json(response);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Page security for internal hire
app.get("/hire-student.html", isAuthenticated, (req, res) => {
  console.log("Serving hire-student.html");
  res.sendFile(__dirname + "/hire-student.html");
});

app.get("/qr-code", async (req, res) => {
  const qrCode = req.query.code;

  if (!qrCode) {
    return res.status(400).json({ error: "QR code is required" });
  }

  try {
    // Process the QR code (e.g., look up information in the database)
    const pool = await getConnection();
    const request = pool.request();
    request.input("qrCode", mssql.VarChar, qrCode);
    const result = await request.query(
      "SELECT * FROM kit_data WHERE contents_of_qr_code = @qrCode"
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "QR code not found" });
    }

    const data = result.recordset[0];
    res.json(data);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/update-kit", async (req, res) => {
  const { id, status } = req.query;
  console.log(id, status);
  var uid;

  if (!id || !status) {
    return res.status(400).json({ error: "ID and status are required" });
  }

  try {
    const pool = await getConnection();
    const request = pool.request();
    request.input("id", mssql.Int, id);
    request.input("status", mssql.VarChar, status);

    if (status === "Available") {
      await request.query(`
        UPDATE kit_data
        SET status = @status, on_loan = 0
        WHERE id = @id
      `);
    } else if (status === "On Loan") {
      await request.query(`
        UPDATE kit_data
        SET status = @status, on_loan = 1
        WHERE id = @id
      `);
    } else if (status === "Missing") {
      await request.query(`
        UPDATE kit_data
        SET status = @status, on_loan = 0
        WHERE id = @id
      `);
    } else {
      return res.status(400).json({ error: "Invalid status value" });
    }

    uid = id.toString();
  } catch (err) {
    console.error("Query error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }

  try {
    const pool = await getConnection();
    const request = pool.request();
    request.input("id", mssql.VarChar, uid);
    const result = await request.query("SELECT * FROM kit_data WHERE id = @id");

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "QR code not found" });
    }

    const data = result.recordset[0];
    res.json(data);
  } catch (err) {
    console.error("Query error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/add-note", async (req, res) => {
  const { id, note } = req.body;

  if (!id || !note) {
    return res.status(400).json({ error: "ID and note are required" });
  }

  try {
    const pool = await getConnection();
    const request = pool.request();
    request.input("id", mssql.Int, id);
    request.input("note", mssql.VarChar, note);

    await request.query(`
      UPDATE kit_data
      SET notes = @note
      WHERE id = @id
    `);

    const result = await request.query("SELECT * FROM kit_data WHERE id = @id");

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Kit item not found" });
    }

    const data = result.recordset[0];
    res.json(data);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Handle CSV upload
app.post('/upload-csv', async (req, res) => {
  console.log('Received upload request');
  if (!req.files || Object.keys(req.files).length === 0) {
    console.log('No files were uploaded.');
    return res.status(400).send({ message: 'No files were uploaded.' });
  }

  const csvFile = req.files.csvFile;
  const uploadPath = path.join(uploadsDir, csvFile.name);

  console.log('Uploading file to:', uploadPath);

  csvFile.mv(uploadPath, async (err) => {
    if (err) {
      console.error('Error moving file:', err);
      return res.status(500).send({ message: 'Error uploading file.' });
    }

    console.log('File uploaded successfully:', uploadPath);

    const pool = await getConnection();
    const request = pool.request();

    const rows = [];
    fs.createReadStream(uploadPath)
      .pipe(csv())
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', async () => {
        const totalRows = rows.length;
        let processedRows = 0;

        for (const row of rows) {
          console.log('Row data:', row); // Log the row data to debug

          // Handle missing or undefined values
          const contents_of_qr_code = row.contents_of_qr_code || '';
          const status = row.status || '';
          const category = row.category || '';
          const manufacturer = row['manufacturer '] || ''; // Note the space in the key
          const attribute_brand = row.attribute_brand || '';
          const attribute_color = row.attribute_color || '';
          const attribute_size = row.attribute_size || '';
          const is_a_set = row.is_a_set || 0;
          const number_in_set = row.number_in_set === 'NULL' ? null : row.number_in_set || 0;
          const number_present_in_set = row.number_present_in_set === 'NULL' ? null : row.number_present_in_set || 0;
          const purchased_date = formatDate(row.purchased_date);
          const purchased_value = row.purchased_value || '';
          const purchased_from = row.purchased_from || '';
          const next_inspection_date = formatDate(row.next_inspection_date);
          const last_inspection_date = formatDate(row.last_inspection_date);
          const working_life_in_years = row.working_life_in_years === 'NULL' ? null : row.working_life_in_years || 0;
          const retirement_date = formatDate(row.retirement_date);
          const on_loan = row.on_loan || 0;
          const notes = row.notes || '';

          const query = `
            INSERT INTO kit_data (
              contents_of_qr_code, status, category, manufacturer, attribute_brand, 
              attribute_color, attribute_size, is_a_set, number_in_set, 
              number_present_in_set, purchased_date, purchased_value, purchased_from, 
              next_inspection_date, last_inspection_date, working_life_in_years, 
              retirement_date, on_loan, notes
            ) VALUES (
              '${contents_of_qr_code}', '${status}', '${category}', '${manufacturer}', '${attribute_brand}', 
              '${attribute_color}', '${attribute_size}', ${is_a_set}, ${number_in_set}, 
              ${number_present_in_set}, ${purchased_date ? `'${purchased_date}'` : null}, '${purchased_value}', '${purchased_from}', 
              ${next_inspection_date ? `'${next_inspection_date}'` : null}, ${last_inspection_date ? `'${last_inspection_date}'` : null}, ${working_life_in_years}, 
              ${retirement_date ? `'${retirement_date}'` : null}, ${on_loan}, '${notes}'
            )`;

          let retries = 20;
          while (retries) {
            try {
              console.log('Executing query:', query);
              await request.query(query);
              break; // Break the loop if the query is successful
            } catch (err) {
              console.error('Error inserting data:', err);
              retries -= 1;
              console.log(`Retries left for this row: ${retries}`);
              if (!retries) throw err;
              await new Promise((res) => setTimeout(res, 6000)); // Wait 6 seconds before retrying
            }
          }

          processedRows++;
          const progress = Math.round((processedRows / totalRows) * 100);
          res.write(JSON.stringify({ progress: progress }) + '\n');
          }

          // Remove the uploaded file
          fs.unlinkSync(uploadPath);
          console.log('CSV file successfully processed.');
          res.write(JSON.stringify({ progress: 100 }) + '\n');
          res.end();
      });
  });
});


/*
    //request.query("CREATE TABLE login(user_id INT IDENTITY(1,1) PRIMARY KEY,	username VARCHAR(50), password_hash VARCHAR(50), encrypt_key VARCHAR(50), exped_level VARCHAR(6), loan_paid BIT, no_of_loaned_items INT);", function (err, success) {});
    //request.query("CREATE TABLE kit_hire(user_id INT PRIMARY KEY, loan_start_date DATE, loan_end_date DATE, loan_name VARCHAR(50), loan_email VARCHAR(70), loan_paid BIT, rental_value VARCHAR(10), kit_id1 INT, kit_id2 INT, kit_id3 INT, kit_id4 INT, kit_id5 INT);", function (err, success) {});
*/
/*  
    const username = "rfaughny2";
    const password = "$2a$04$hYFCtwlw8MLiSqMl.JaMSeZbCgI6jZqPPSzb2wDHeU8Xo/GLz.z0u";
    console.log(checkLoginData(request, username, password));*/
/*
// Handle login form submissions
app.post("/submit-login-form", (req, res) => {
  console.log("Form submission received"); // Log when the form is received

  const loginFormData = req.body;
  console.log("Form data:", loginFormData); // Log the form data

  const username = loginFormData["uname"];
  const password = loginFormData["psw"];
  const remember = loginFormData["remember"];
  console.log("Username:", username);
  console.log("Password:", password);
  if (remember==="on") {
    console.log("Remember me: true");
  } else {
    console.log("Remember me: false");
  }
});


*/

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
