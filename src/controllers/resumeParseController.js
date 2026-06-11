const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Groq = require("groq-sdk");

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const parseResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const file = req.file;
    let text = "";

    if (file.mimetype === "application/pdf") {
      const data = await pdfParse(file.buffer);
      text = data.text;
    } else if (file.mimetype.includes("word")) {
      const data = await mammoth.extractRawText({ buffer: file.buffer });
      text = data.value;
    } else {
      return res.status(400).json({ message: "Only PDF or DOCX allowed" });
    }

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `Extract information from this resume and return ONLY a valid JSON object. No markdown, no extra text, just raw JSON.

Use exactly this structure:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "summary": "string",
  "skills": ["string"],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "startYear": "string",
      "endYear": "string"
    }
  ],
  "experience": [
    {
      "title": "string",
      "company": "string",
      "duration": "string",
      "description": "string"
    }
  ]
}

Rules:
- experience "title" is the job role/position/designation
- experience "description" is a single string summarizing achievements
- education "degree" is the qualification name
- education "startYear" and "endYear" must be extracted from duration like "2021-2025"
- If a field is missing, use empty string ""
- skills must be a flat array of strings
- Return nothing except the JSON object

Resume:
${text}`,
        },
      ],
    });

    const raw = response.choices[0].message.content;
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Normalize — guarantee shape even if LLM deviates
    const normalized = {
      name: parsed.name || "",
      email: parsed.email || "",
      phone: parsed.phone || "",
      location: parsed.location || "",
      summary: parsed.summary || "",
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      education: Array.isArray(parsed.education)
        ? parsed.education.map((e) => ({
            degree: e.degree || "",
            institution: e.institution || "",
            startYear: e.startYear || "",
            endYear: e.endYear || "",
          }))
        : [],
      experience: Array.isArray(parsed.experience)
        ? parsed.experience.map((e) => ({
            title: e.title || e.role || e.position || e.designation || "",
            company: e.company || "",
            duration: e.duration || "",
            description: Array.isArray(e.description)
              ? e.description.join(", ")
              : e.description || e.achievements?.join(", ") || "",
          }))
        : [],
    };

    res.status(200).json({ success: true, data: normalized });
  } catch (err) {
    console.error("Resume parse error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { parseResume };

// const pdfParse = require("pdf-parse");
// const mammoth = require("mammoth");
// const Groq = require("groq-sdk");

// const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// const parseResume = async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: "No file uploaded" });

//     const file = req.file;
//     let text = "";

//     if (file.mimetype === "application/pdf") {
//       const data = await pdfParse(file.buffer);
//       text = data.text;
//     } else if (file.mimetype.includes("word")) {
//       const data = await mammoth.extractRawText({ buffer: file.buffer });
//       text = data.value;
//     } else {
//       return res.status(400).json({ message: "Only PDF or DOCX allowed" });
//     }

//     const response = await client.chat.completions.create({
//       model: "llama-3.3-70b-versatile",
//       messages: [
//         {
//           role: "user",
//           content: `Extract info from this resume and return ONLY a JSON object with keys:
//         name, email, phone, skills (array), education (array), experience (array).
//         No extra text, no markdown, just raw JSON.

//         Resume:
//         ${text}`,
//         },
//       ],
//     });

//     const raw = response.choices[0].message.content;
//     const clean = raw.replace(/```json|```/g, "").trim();
//     const parsed = JSON.parse(clean);

//     res.status(200).json({ success: true, data: parsed });
//   } catch (err) {
//     console.error("Resume parse error:", err.message);
//     res.status(500).json({ message: err.message });
//   }
// };

// module.exports = { parseResume };

// const fs = require("fs");
// const pdf = require("pdf-parse");
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const Resume = require("../models/Resume");
// const User = require("../models/User");
// const { AppError, sendSuccess } = require("../utils/AppError");

// const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// function safeParse(text) {
//   if (!text) throw new Error("Empty AI response");
//   const match = text.match(/\{[\s\S]*\}/);
//   if (!match) throw new Error("No JSON found in response");
//   return JSON.parse(match[0]);
// }

// exports.parseResume = async (req, res, next) => {
//   let resume;

//   try {
//     const file = req.file;
//     if (!file) return next(new AppError("No file uploaded", 400));

//     const label = (req.body.label || file.originalname).replace(
//       /\.[^/.]+$/,
//       "",
//     );
//     const isDefault = req.body.isDefault === "true";

//     if (isDefault) {
//       await Resume.updateMany({ user: req.user.id }, { isDefault: false });
//     }

//     resume = await Resume.create({
//       user: req.user.id,
//       label,
//       fileName: file.filename,
//       originalName: file.originalname,
//       filePath: file.path,
//       fileSize: file.size,
//       mimeType: file.mimetype,
//       isDefault,
//       version: 1,
//       isParsed: false,
//     });

//     console.log("=== RESUME PARSE START ===");

//     const pdfBuffer = fs.readFileSync(file.path);
//     const pdfData = await pdf(pdfBuffer);
//     const resumeText = pdfData.text || "";

//     console.log("TEXT LENGTH:", resumeText.length);

//     if (resumeText.length < 20) {
//       throw new AppError("Could not extract readable text from PDF", 400);
//     }

//     const model = client.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

//     const prompt = `You are a strict JSON generator.
// Return ONLY valid JSON. No markdown. No explanation.

// Schema:
// {
//   "name": "",
//   "email": "",
//   "phone": "",
//   "location": "",
//   "currentRole": "",
//   "experience": "",
//   "expectedSalary": "",
//   "summary": "",
//   "skills": []
// }

// Resume:
// ${resumeText}`;

//     const result = await Promise.race([
//       model.generateContent(prompt),
//       new Promise((_, reject) =>
//         setTimeout(() => reject(new Error("Gemini timeout after 30s")), 30000),
//       ),
//     ]);

//     const raw = result.response.text().trim();
//     console.log("RAW GEMINI RESPONSE:\n", raw);

//     const extracted = safeParse(raw);
//     console.log("PARSED RESULT:", extracted);

//     await Resume.findByIdAndUpdate(resume._id, {
//       isParsed: true,
//       parsedData: extracted,
//       parseError: null,
//       tags: extracted.skills?.slice(0, 10) || [],
//     });

//     await User.findByIdAndUpdate(req.user.id, {
//       "profile.phone": extracted.phone || null,
//       "profile.location": extracted.location || null,
//       "profile.currentRole": extracted.currentRole || null,
//       "profile.experience": extracted.experience || null,
//       "profile.expectedSalary": extracted.expectedSalary || null,
//       "profile.skills": extracted.skills || [],
//       "profile.summary": extracted.summary || null,
//       "profile.profileComplete": true,
//       ...(extracted.name && { name: extracted.name }),
//     });

//     try {
//       fs.unlinkSync(file.path);
//     } catch {}

//     return sendSuccess(
//       res,
//       "Resume uploaded and parsed successfully",
//       { resume, extracted },
//       null,
//       201,
//     );
//   } catch (err) {
//     console.error("=== PARSE ERROR ===", err.message);

//     if (resume?._id) {
//       await Resume.findByIdAndUpdate(resume._id, {
//         isParsed: false,
//         parseError: err.message,
//       });
//     }

//     if (req.file?.path) {
//       try {
//         fs.unlinkSync(req.file.path);
//       } catch {}
//     }

//     return next(err);
//   }
// };

// const fs = require("fs");
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const Resume = require("../models/Resume");
// const User = require("../models/User");
// const { AppError, sendSuccess } = require("../utils/AppError");

// const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// exports.parseResume = async (req, res, next) => {
//   try {
//     const file = req.file;
//     if (!file) return next(new AppError("No file uploaded", 400));

//     const label = (req.body.label || file.originalname).replace(
//       /\.[^/.]+$/,
//       "",
//     );
//     const isDefault = req.body.isDefault === "true";

//     // 1. If default, unset all others
//     if (isDefault) {
//       await Resume.updateMany({ user: req.user.id }, { isDefault: false });
//     }

//     // 2. Save resume to DB first
//     const resume = await Resume.create({
//       user: req.user.id,
//       label,
//       fileName: file.filename,
//       originalName: file.originalname,
//       filePath: file.path,
//       fileSize: file.size,
//       mimeType: file.mimetype,
//       isDefault,
//       version: 1,
//       isParsed: false,
//     });

//     // 3. Send PDF directly to Gemini
//     let extracted = null;
//     try {
//       console.log("=== GEMINI PARSE START ===");
//       console.log("FILE PATH:", file.path);
//       console.log("FILE EXISTS:", fs.existsSync(file.path));

//       const pdfBuffer = fs.readFileSync(file.path);
//       console.log("FILE SIZE:", pdfBuffer.length);

//       const pdfBase64 = pdfBuffer.toString("base64");
//       console.log("BASE64 LENGTH:", pdfBase64.length);

//       console.log("GEMINI API KEY EXISTS:", !!process.env.GEMINI_API_KEY);
//       console.log(
//         "GEMINI API KEY PREFIX:",
//         process.env.GEMINI_API_KEY?.slice(0, 8),
//       );
//       const model = client.getGenerativeModel({
//         model: "gemini-1.5-flash-latest",
//       });
//       console.log("MODEL CREATED");

//       const result = await model.generateContent([
//         {
//           inlineData: {
//             mimeType: "application/pdf",
//             data: pdfBase64,
//           },
//         },
//         {
//           text: `Extract information from this resume and return ONLY a valid JSON object, no markdown, no extra text:
//   {
//     "name": "",
//     "email": "",
//     "phone": "",
//     "location": "",
//     "currentRole": "",
//     "experience": "",
//     "expectedSalary": "",
//     "summary": "",
//     "skills": []
//   }`,
//         },
//       ]);

//       console.log("GEMINI RESPONDED");
//       const raw = result.response.text().trim();
//       console.log("RAW GEMINI RESPONSE:", raw);

//       const clean = raw.replace(/```json|```/g, "").trim();
//       console.log("CLEAN:", clean);

//       extracted = JSON.parse(clean);
//       console.log("PARSED EXTRACTED:", extracted);

//       // 4. Update resume with parsed data
//       await Resume.findByIdAndUpdate(resume._id, {
//         isParsed: true,
//         parsedData: extracted,
//         parseError: null,
//         tags: extracted.skills?.slice(0, 10) || [],
//       });

//       // 5. Save extracted profile to User
//       await User.findByIdAndUpdate(req.user.id, {
//         "profile.phone": extracted.phone || null,
//         "profile.location": extracted.location || null,
//         "profile.currentRole": extracted.currentRole || null,
//         "profile.experience": extracted.experience || null,
//         "profile.expectedSalary": extracted.expectedSalary || null,
//         "profile.skills": extracted.skills || [],
//         "profile.summary": extracted.summary || null,
//         "profile.profileComplete": true,
//         ...(extracted.name && { name: extracted.name }),
//       });

//       console.log("=== GEMINI PARSE SUCCESS ===");
//     } catch (aiErr) {
//       console.error("=== GEMINI PARSE FAILED ===");
//       console.error("ERROR NAME:", aiErr.name);
//       console.error("ERROR MESSAGE:", aiErr.message);
//       console.error("ERROR STACK:", aiErr.stack);
//       console.error("FULL ERROR:", aiErr);

//       await Resume.findByIdAndUpdate(resume._id, {
//         isParsed: false,
//         parseError: aiErr.message,
//       });
//     }

//     // 6. Cleanup temp file
//     try {
//       fs.unlinkSync(file.path);
//       console.log("TEMP FILE CLEANED UP");
//     } catch (cleanErr) {
//       console.error("CLEANUP ERROR:", cleanErr.message);
//     }

//     sendSuccess(
//       res,
//       "Resume uploaded and parsed",
//       { resume, extracted },
//       null,
//       201,
//     );
//   } catch (err) {
//     console.error("HARD ERROR:", err);
//     if (req.file?.path) {
//       try {
//         fs.unlinkSync(req.file.path);
//       } catch {}
//     }
//     next(err);
//   }
// };
