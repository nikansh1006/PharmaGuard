import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { parseVcf } from "../services/vcfParser.js";
import { evaluateDrugRisk } from "../services/riskEngine.js";
import { generateExplanation } from "../services/llmService.js";
import fs from "fs";
const router = express.Router();
const upload = multer({ dest: "uploads/" });
router.post("/analyze", upload.single("vcf_file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "VCF file is required." });
        }
        if (!req.body.drugs) {
            return res.status(400).json({ error: "Drug names (comma-separated) are required." });
        }
        const drugs = req.body.drugs.split(",").map((s) => s.trim());
        const vcfPath = req.file.path;
        const patientId = `PATIENT_${uuidv4().substring(0, 8).toUpperCase()}`;
        const variants = await parseVcf(vcfPath);
        const results = [];
        for (const drug of drugs) {
            const riskData = evaluateDrugRisk(drug, variants);
            const explanation = await generateExplanation(riskData);
            results.push({
                patient_id: patientId,
                drug: drug,
                timestamp: new Date().toISOString(),
                risk_assessment: {
                    risk_label: riskData.risk_label,
                    confidence_score: riskData.confidence_score,
                    severity: riskData.severity
                },
                pharmacogenomic_profile: {
                    primary_gene: riskData.gene,
                    diplotype: riskData.diplotype,
                    phenotype: riskData.phenotype,
                    detected_variants: riskData.detected_variants.map(v => ({
                        rsid: v.rsid,
                        gene: v.gene,
                        star: v.star
                    }))
                },
                clinical_recommendation: {
                    guideline_source: "CPIC",
                    recommendation: riskData.recommendation
                },
                llm_generated_explanation: {
                    summary: explanation.summary,
                    mechanism: explanation.mechanism
                },
                quality_metrics: {
                    vcf_parsing_success: true,
                    variants_detected: variants.length
                }
            });
        }
        // Cleanup uploaded file
        fs.unlinkSync(vcfPath);
        res.json(results);
    }
    catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
});
export default router;
//# sourceMappingURL=analyze.js.map