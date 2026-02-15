# Arc Validation Checklist

## 1) インストール確認

- `arc://extensions` で unpacked 読み込みできる
- 拡張アイコンからPopupが開く
- エラーが出る場合は service worker のコンソールを確認

## 2) CRUD確認

- 新規作成 → 一覧表示
- 編集 → 更新日時が更新
- 削除 → 一覧・スロット割り当てから除去
- 複製 → copyが作成

## 3) 実行確認

- 通常のWebページで実行できる
- `arc://` や `chrome://` では拒否メッセージが出る
- エラー時にUIで失敗メッセージが確認できる

## 4) ショートカット確認

- `open-launcher` コマンドでPopup起動
- `run-slot-1..4` が設定モードに従って動作
- `arc://extensions/shortcuts` でキー変更が反映される

## 5) 同期/ローカル保存確認

- メタ情報は再起動後も保持
- コード本体はローカルに保持
- JSONエクスポート→インポートで再現できる