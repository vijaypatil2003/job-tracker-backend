const Groq = require("groq-sdk");
const JobApplication = require("../models/JobApplication");
const Profile = require("../models/profile.model");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

exports.extractJobDetails = async (req, res, next) => {
  try {
    let jobDescription = req.body.jobDescription;

    if (!jobDescription) {
      return res
        .status(400)
        .json({ success: false, message: "Job description is required" });
    }

    jobDescription = jobDescription
      .replace(/\r\n/g, " ")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `You are a data extraction assistant. Extract the following fields from the job description below.
          
Return ONLY a raw JSON object, no markdown, no backticks, no explanation.

Fields to extract:
- companyName: the hiring company name
- email: any contact or HR email address
- phone: any contact phone number
- jobRole: the job title or position
- location: city or country of the job
- experience: required experience (e.g. 0-2 years)
- salary: if mentioned
- applyLink: any application URL or job apply link

Rules:
- If a field is not found, set it to "Not Found"
- Return ONLY JSON, nothing else

Job Description:
${jobDescription}`,
        },
      ],
    });

    const raw = response.choices[0].message.content;

    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/^\s*[\r\n]/gm, "")
      .trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (parseErr) {
      return res.status(200).json({
        success: true,
        data: {
          companyName: "Not Found",
          email: "Not Found",
          phone: "Not Found",
          jobRole: "Not Found",
          location: "Not Found",
          experience: "Not Found",
          salary: "Not Found",
          applyLink: "Not Found",
        },
        raw,
      });
    }

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getFitScore = async (req, res, next) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      return res
        .status(400)
        .json({ success: false, message: "jobId is required" });
    }

    // Fetch job
    const job = await JobApplication.findOne({
      _id: jobId,
      user: req.user.id,
    });
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (!job.jobDescription) {
      return res.status(400).json({
        success: false,
        message: "Job description is missing. Add it to the application first.",
      });
    }

    // Fetch profile
    const profile = await Profile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found. Complete your profile first.",
      });
    }

    // Build profile summary for AI
    const profileSummary = {
      skills: profile.skills || [],
      education: (profile.education || []).map(
        (e) =>
          `${e.degree} from ${e.institution} (${e.startYear}-${e.endYear})`,
      ),
      experience: (profile.experience || []).map(
        (e) => `${e.title} at ${e.company} (${e.duration}): ${e.description}`,
      ),
      location: profile.location || "",
      preferredRole: profile.careerPreferences?.preferredRole || "",
      preferredLocation: profile.careerPreferences?.preferredLocation || "",
      employmentTypes: profile.careerPreferences?.employmentTypes || [],
    };

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `You are a career advisor AI. Analyze how well a candidate's profile matches a job description.

Return ONLY a raw JSON object, no markdown, no backticks, no explanation.

Use exactly this structure:
{
  "overallScore": <number 0-100>,
  "skillsMatch": {
    "score": <number 0-100>,
    "matched": [<list of matching skills>],
    "missing": [<list of required skills not in profile>]
  },
  "educationMatch": {
    "score": <number 0-100>,
    "comment": "<one sentence assessment>"
  },
  "experienceMatch": {
    "score": <number 0-100>,
    "comment": "<one sentence assessment>"
  },
  "locationMatch": {
    "score": <number 0-100>,
    "comment": "<one sentence assessment>"
  },
  "suggestions": [<list of 3-5 actionable improvement suggestions>]
}

Rules:
- overallScore is weighted average: skills 40%, experience 30%, education 20%, location 10%
- Be honest and accurate
- matched and missing must be arrays of strings
- suggestions must be actionable and specific
- Return ONLY JSON nothing else

Candidate Profile:
${JSON.stringify(profileSummary, null, 2)}

Job Description:
${job.jobDescription}`,
        },
      ],
    });

    const raw = response.choices[0].message.content;
    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/^\s*[\r\n]/gm, "")
      .trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (parseErr) {
      return res.status(500).json({
        success: false,
        message: "AI response could not be parsed. Try again.",
        raw,
      });
    }

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
