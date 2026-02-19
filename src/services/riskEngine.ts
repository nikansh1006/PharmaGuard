import fs from "fs";
import { VcfVariant } from "./vcfParser.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rulesPath = path.join(__dirname, "../rules/cpicRules.json");
const rules = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));

export interface RiskResult {
  drug: string;
  gene: string;
  diplotype: string;
  phenotype: string;
  risk_label: string;
  severity: string;
  recommendation: string;
  confidence_score: number;
  detected_variants: VcfVariant[];
}

export function evaluateDrugRisk(drugName: string, variants: VcfVariant[]): RiskResult {
  const normalizedDrug = drugName.toUpperCase().trim();
  
  // Find which gene covers this drug
  let targetGene = "";
  for (const gene in rules.genes) {
    if (rules.genes[gene].drug_risks[normalizedDrug]) {
      targetGene = gene;
      break;
    }
  }

  if (!targetGene) {
    return {
      drug: normalizedDrug,
      gene: "Unknown",
      diplotype: "Unknown",
      phenotype: "Unknown",
      risk_label: "Unknown",
      severity: "none",
      recommendation: "Drug-gene pair not found in CPIC guidelines.",
      confidence_score: 0.3,
      detected_variants: []
    };
  }

  const geneRules = rules.genes[targetGene];
  const geneVariants = variants.filter(v => v.gene === targetGene);
  
  // Build diplotype (e.g., *4/*10)
  // Ensure alleles are sorted alphabetically (e.g., *1/*2 instead of *2/*1)
  let diplotype = "*1/*1"; // Default to wild type
  if (geneVariants.length > 0) {
    const stars = geneVariants.map(v => v.star);
    // Add wild type *1 if only one variant is found to represent the other allele
    if (stars.length === 1) {
      stars.push("*1");
    }
    // Sort alleles for consistent lookup
    stars.sort((a, b) => {
      const numA = parseInt(a.replace("*", "")) || 0;
      const numB = parseInt(b.replace("*", "")) || 0;
      return numA - numB;
    });
    diplotype = stars.slice(0, 2).join("/"); 
  }

  const phenotype = geneRules.diplotype_to_phenotype[diplotype] || "Unknown";
  const riskData = geneRules.drug_risks[normalizedDrug][phenotype] || {
    risk: "Unknown",
    severity: "none",
    recommendation: "Phenotype-specific recommendation not found."
  };

  // Dynamic confidence scoring
  let confidence_score = 0.3;
  if (phenotype !== "Unknown" && riskData.risk !== "Unknown") {
    confidence_score = 0.95;
  } else if (targetGene !== "Unknown") {
    confidence_score = 0.7;
  }

  return {
    drug: normalizedDrug,
    gene: targetGene,
    diplotype,
    phenotype,
    risk_label: riskData.risk,
    severity: riskData.severity,
    recommendation: riskData.recommendation,
    confidence_score,
    detected_variants: geneVariants
  };
}
