import fs from "fs";
import readline from "readline";
export async function parseVcf(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });
    const variants = [];
    for await (const line of rl) {
        if (!line || line.startsWith("#"))
            continue;
        const columns = line.split("\t");
        if (columns.length < 8)
            continue;
        const id = columns[2];
        const info = columns[7];
        if (typeof id !== "string" || typeof info !== "string")
            continue;
        const infoMap = Object.fromEntries(info.split(";").map((item) => {
            const [key, value] = item.split("=");
            return [key, value ?? ""];
        }));
        if (infoMap.GENE && infoMap.STAR) {
            variants.push({
                gene: infoMap.GENE,
                rsid: id && id !== "." ? id : "",
                star: infoMap.STAR,
            });
        }
    }
    return variants;
}
//# sourceMappingURL=vcfParser.js.map