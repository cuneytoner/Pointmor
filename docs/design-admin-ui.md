2. **Yeni stiller** mümkünse `plus-shell.css` içinde, mevcut öneklerle (`gov-`, `toolbar__`, `plan-card__`) tutarlı isimlendir.
3. **Inline `style={{}}`:** Kaçın; layout için sınıf ekle (ör. `plan-card__title-row`, `toolbar__search--block`). Gerçekten tek seferlik dinamik değer gerekiyorsa istisna.
4. **Odak:** Etkileşimli kontrollerde `:focus-visible` ile görünür odak halkası (birincil düğmede tanımlı).
5. **Giriş dışı** uygulama gövdesi: `PageShell` + `admin-app__card` desenini koru.
