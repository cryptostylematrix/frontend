import { crc32c } from "@ton/core";
import { sha256_sync } from "@ton/crypto";

export const sha256n = (text: string) =>{
    return BigInt("0x" + sha256_sync(Buffer.from(text, "utf8")).toString("hex"));
}

export const crc32FromString = (name: string) =>{
    const nameBoffuer = Buffer.from(name, "utf8");
    const nameCrc32 = crc32c(nameBoffuer);
    const result = nameCrc32.readUInt32BE(0); // or LE depending on schema
    return result;
}