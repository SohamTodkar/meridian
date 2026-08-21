import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "next-env.d.ts",
    ],
  },
];

export default config;
