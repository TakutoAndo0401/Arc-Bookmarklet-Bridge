# Arc Bookmarklet Bridge

Arcブラウザ（Chromium拡張互換）向けの、ブックマークレット管理拡張です。

## できること

- ブックマークレットのCRUD（作成・編集・削除・複製）
- クイック実行ランチャー（Popup）
- ショートカット実行（ランチャー / 固定スロット / 両方）
- JSONインポート / エクスポート
- お気に入り・最近使った順表示

## Arcでの読み込み手順（macOS）

1. Arcで `arc://extensions` を開く
2. 右上のDeveloper modeをON
3. **Load unpacked** からこのフォルダを選択
4. 拡張の「詳細」から必要に応じて権限を確認

## ショートカット設定

- 拡張内の設定画面で、モードを選択
  - ランチャーのみ
  - 固定スロットのみ
  - ランチャー + 固定スロット
- キー割り当て自体は `arc://extensions/shortcuts` で変更

## データ保存ポリシー

- メタ情報（名前・タグ・お気に入り・最終利用日時・スロット設定）: `chrome.storage.sync`
- コード本体: `chrome.storage.local`

## 制約と注意

- `arc://`, `chrome://` などの特殊ページでは実行不可
- ページ側CSP次第で一部コードが実行できない場合あり
- MV3制約により、コマンドは固定スロット方式（動的追加不可）

## 補足

詳細な検証観点は [docs/arc-validation.md](docs/arc-validation.md) を参照してください。