/* PROTOTYPE fonts: Direction A display serif and Direction C editorial pairing (Newsreader: Instrument Serif's "1" read as "l" in amounts). */
import { Newsreader, Public_Sans, Source_Serif_4 } from "next/font/google";
import "./prototype.css";

export const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-source-serif", display: "swap" });
export const editorialSerif = Newsreader({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-editorial", display: "swap" });
export const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-public-sans", display: "swap" });
