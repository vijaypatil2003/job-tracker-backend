/**
 * AI-style follow-up email template generator
 * Generates contextual email templates based on job application status
 */

const templates = {
  followUp: ({ name, companyName, jobRole, appliedDate, hrName }) => ({
    subject: `Following Up – ${jobRole} Application at ${companyName}`,
    body: `Hi ${hrName || 'Hiring Team'},

I hope this message finds you well. I'm writing to follow up on my application for the ${jobRole} position at ${companyName}, which I submitted on ${new Date(appliedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.

I remain very enthusiastic about this opportunity and would love to learn more about the next steps in the hiring process.

Please let me know if you need any additional information from my end. I look forward to hearing from you.

Best regards,
${name}`,
  }),

  interviewThankYou: ({ name, companyName, jobRole, hrName, interviewDate }) => ({
    subject: `Thank You – ${jobRole} Interview at ${companyName}`,
    body: `Hi ${hrName || 'Hiring Team'},

Thank you for taking the time to interview me for the ${jobRole} position at ${companyName}${interviewDate ? ` on ${new Date(interviewDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : ''}.

I truly enjoyed learning more about the role and the team. The conversation reinforced my excitement about the opportunity to contribute to ${companyName}.

Please let me know if there's anything else you need from my side to move the process forward.

Best regards,
${name}`,
  }),

  offerNegotiation: ({ name, companyName, jobRole, hrName, expectedSalary }) => ({
    subject: `Re: Offer for ${jobRole} – ${companyName}`,
    body: `Hi ${hrName || 'Hiring Team'},

Thank you for extending the offer for the ${jobRole} position at ${companyName}. I'm genuinely excited about this opportunity.

After careful consideration, I was hoping we could discuss the compensation package. Based on my experience and market research, I was expecting a figure closer to ${expectedSalary || '[Expected Salary]'}. I believe this reflects the value I would bring to the team.

I'm very much looking forward to joining ${companyName} and am confident we can reach a mutually beneficial agreement. Please let me know a good time to discuss this further.

Best regards,
${name}`,
  }),

  withdrawal: ({ name, companyName, jobRole, hrName }) => ({
    subject: `Withdrawing Application – ${jobRole} at ${companyName}`,
    body: `Hi ${hrName || 'Hiring Team'},

I hope you're doing well. I am writing to formally withdraw my application for the ${jobRole} position at ${companyName}.

This was a difficult decision, as I have great respect for your organization. However, I have accepted another opportunity that aligns more closely with my current career goals.

Thank you for your time and consideration throughout this process. I hope our paths cross again in the future.

Best regards,
${name}`,
  }),
};

/**
 * Generate an email template
 * @param {string} type - followUp | interviewThankYou | offerNegotiation | withdrawal
 * @param {object} data - context data
 */
const generateEmailTemplate = (type, data) => {
  const generator = templates[type];
  if (!generator) {
    throw new Error(`Unknown template type: ${type}. Available: ${Object.keys(templates).join(', ')}`);
  }
  return generator(data);
};

const getAvailableTemplates = () => Object.keys(templates);

module.exports = { generateEmailTemplate, getAvailableTemplates };
