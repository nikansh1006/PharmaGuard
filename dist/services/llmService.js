import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
export async function generateExplanation(riskData) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
    As a clinical pharmacogenomics expert, explain the following risk assessment to a healthcare provider.
    
    Drug: ${riskData.drug}
    Gene: ${riskData.gene}
    Diplotype: ${riskData.diplotype}
    Phenotype: ${riskData.phenotype}
    Risk Label: ${riskData.risk_label}
    Recommendation: ${riskData.recommendation}
    
    Detected Variants: ${JSON.stringify(riskData.detected_variants)}
    
    Provide a structured response in plain text with two sections:
    1. Summary: A concise explanation of the risk.
    2. Mechanism: The biological/pharmacokinetic mechanism explaining how this genotype affects drug response.
    
    The response must be professional, clinically accurate, and mention the specific gene and variants.
  `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Crude parsing of LLM response into sections
        const summaryMatch = text.match(/Summary:([\s\S]*?)(?=Mechanism:|$)/i);
        const mechanismMatch = text.match(/Mechanism:([\s\S]*?)$/i);
        return {
            summary: summaryMatch?.[1]?.trim() || generateFallbackSummary(riskData),
            mechanism: mechanismMatch?.[1]?.trim() || generateFallbackMechanism(riskData)
        };
    }
    catch (error) {
        console.error("LLM Generation Error:", error);
        return {
            summary: generateFallbackSummary(riskData),
            mechanism: generateFallbackMechanism(riskData)
        };
    }
}
function generateFallbackSummary(riskData) {
    if (riskData.risk_label === "Safe") {
        return `Patient is a ${riskData.phenotype} for ${riskData.gene}. Standard dosing of ${riskData.drug} is likely safe.`;
    }
    if (riskData.risk_label === "Toxic" || riskData.risk_label === "Ineffective") {
        return `Critical risk detected for ${riskData.drug} due to ${riskData.gene} ${riskData.phenotype} status. ${riskData.recommendation}`;
    }
    return `Adjustments may be needed for ${riskData.drug} based on ${riskData.gene} ${riskData.phenotype} phenotype.`;
}
function generateFallbackMechanism(riskData) {
    const variants = riskData.detected_variants.map((v) => v.star).join(", ");
    return `The ${riskData.gene} gene (variants: ${variants}) modifies the metabolic rate or transporter activity for ${riskData.drug}, leading to altered plasma levels or drug response as identified in CPIC guidelines.`;
}
//# sourceMappingURL=llmService.js.map