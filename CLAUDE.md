# Future Hub

## Konwencje

- **Nazewnictwo**: wylacznie camelCase (zmienne, funkcje, pliki, foldery)
- **Dokumentacja API**: przy kazdej zmianie w endpointach REST lub MCP (dodanie, modyfikacja, usuniecie) — zaktualizuj rowniez widok dokumentacji API w `packages/client/src/views/apiDocs.vue` (tablica `sections`)

## Struktura

- `docs/` — dokumentacja, scenariusze, notatki
- `.claude/skills/` — skille projektowe (dostepne jako `/project:nazwa`)

## Jak dodac nowy skill

1. Utworz plik `.claude/skills/nazwa-skilla.md`
2. Wpisz tresc prompta (Markdown)
3. Uzyj w Claude Code: `/project:nazwa-skilla`

Zmienne dostepne w skillach:
- `$ARGUMENTS` — argumenty przekazane przez uzytkownika
- `$SELECTION` — zaznaczony tekst (w IDE)
