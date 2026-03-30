/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Docker / 自前サーバー向け：1コンテナで本番起動 */
  output: "standalone",
};

export default nextConfig;
