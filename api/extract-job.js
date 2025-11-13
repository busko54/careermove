// /api/extract-job.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jobPosting } = req.body;

  if (!jobPosting) {
    return res.status(400).json({ error: 'No job posting provided' });
  }

  try {
    const prompt = `Extract all job details from this posting. Return ONLY valid JSON (no markdown):
{
  "jobTitle": "string",
  "company": "string",
  "baseSalary": number or null,
  "equity": "string or null",
  "bonus": "string or null",
  "hoursPerWeek": number or null,
  "isRemote": boolean,
  "workEnv": "full-remote|hybrid|onsite",
  "fundingStage": "seed|series-a|series-b|growth|public",
  "teamSize": number or null,
  "industry": "string"
}

Job posting:
${jobPosting}`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates[0].content.parts[0].text;
    const extracted = JSON.parse(textContent);

    return res.status(200).json(extracted);
  } catch (error) {
    console.error('Job extraction error:', error);
    return res.status(500).json({ error: 'Failed to extract job data', details: error.message });
  }
}
