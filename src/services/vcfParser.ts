import fs from "fs";
import readline from "readline";

export interface VcfVariant {
  gene: string;
  rsid: string;
  star: string;
}

export async function parseVcf(filePath: string): Promise<VcfVariant[]> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const variants: VcfVariant[] = [];

  for await (const line of rl) {
    if (!line || line.startsWith("#")) continue;

    const columns = line.split("\t");
    if (columns.length < 8) continue;

    const id = columns[2];
    const info = columns[7];

    if (typeof id !== "string" || typeof info !== "string") continue;

    const infoMap: Record<string, string> = Object.fromEntries(
      info.split(";").map((item) => {
        const [key, value] = item.split("=");
        return [key, value ?? ""];
      })
    );

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
