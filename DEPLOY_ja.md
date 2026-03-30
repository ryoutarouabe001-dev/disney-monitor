# サーバーに載せるだけで動かす（Docker）

ローカルで `npm install` しなくてよい方法です。**Docker** が入っているサーバー（VPS・クラウドなど）向けです。

## 必要なもの

- サーバーに **Docker** と **Docker Compose**（v2 の `docker compose`）が入っていること
- このプロジェクトのフォルダ一式（ZIP でも Git でも可）

## 手順（最短）

1. サーバーにフォルダをアップロードする（例: `/opt/magic-vacancy`）。

2. 設定ファイルを作る。例：

   ```bash
   cp .env.example .env
   nano .env
   ```

   `LINE_NOTIFY_TOKEN` やメールを使うなら `EMAIL_USER` / `EMAIL_PASS` も記入。

3. 起動する：

   ```bash
   docker compose up -d --build
   ```

4. ブラウザで `http://サーバーのIP:3000` を開く。

止めるとき：`docker compose down`

## もっと手軽に（Node を触らない）

- **Vercel** に GitHub リポジトリを連携し、環境変数をダッシュボードで入れてデプロイする方法もあります（インフラのイメージは「サーバーに入れる」に近いです）。
