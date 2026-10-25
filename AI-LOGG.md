# Bruk av AI: logg for Fagblom

## Verktøy
Claude (Anthropic) ble brukt til å skrive nesten alt av koden, ut fra det jeg ba om.

## Idé
Jeg valgte en studieplanlegger for eksamener, fordi jeg selv trenger noe slikt. Jeg ville ha nedtelling og varsel når eksamen nærmer seg. Og jeg la til en liten motivasjon med et valg av studie-dyr, nesten slik som en Pokémon.

## Hva jeg ba AI om, og hva som skjedde

1. **Første versjon**
   - Jeg ba om: en eksamens- og studieplanlegger med varsel når eksamen nærmer seg.
   - Resultat: emner, oppgaver, nedtelling og ukeplan.

2. **Nytt utseende**
   - Jeg ba om: et annet utseende, for jeg likte ikke det første.
   - Resultat: krem og gammelrosa med blomster.

3. **Mer moderne oppsett**
   - Jeg ba om: et mer moderne og profesjonelt oppsett, litt som Notion-appen.
   - Resultat: sidemeny og tabell. Jeg likte det litt dårligere ettersom stilen så helt feil ut, så jeg gikk tilbake til blomsterutseendet med flere blomster.

4. **Siden ble vist uten stil**
   - Problem: stilarket fulgte ikke med filen hos meg.
   - Løsning: all kode ble lagt inn i én samlet fil.

5. **Notion-versjonen**
   - Jeg ba om: Notion-utseendet likevel, men denne gangen med andre små-endringer i prompten.
   - Resultat: laget, men jeg likte ikke mobilversjonen. Den ble laget om med toppmeny, ukeplan som liste og større knapper.

6. **Flere funksjoner**
   - Jeg ba om: flere funksjoner, så appen ikke ble for simpel og lik som alle andre studieapper.
   - Resultat: timer og studietid, frist og prioritet på oppgaver, sikkerhetskopi og kalenderfil, mørk modus og mål per emne.

7. **Studiedyr**
   - Jeg ba om: poeng for studietid og et dyr som blir større/eldre.
   - Resultat: et studiedyr med nivåer, først med emoji i stedet for tegninger.

8. **Tegnede dyr og butikk**
   - Jeg ba om: tegnede dyr i stedet for emoji, færre valg (katter, hunder, rev, pingvin, panda og kanin), at de starter som babyer og blir eldre, og poeng som kan brukes på tilbehør.
   - Resultat: åtte tegnede dyr i fire livsstadier og en butikk med 11 ting. Man får også poeng for ferdige oppgaver.

9. **Mer ferdig og profesjonelt**
   - Jeg ba om: at appen skulle virke mindre rå (at alt ligger på en side og ser litt uferdig ut), med egne sider, en profilside og venner med toppliste.
   - Resultat: seks sider med meny, en oversikt med nøkkeltall, en profilside og en demo-toppliste. Jeg valgte en demo, siden ekte venner krever en server.

10. **Navn**
    - Jeg ba om: et navn som høres ut som en ekte app.
    - Resultat: jeg valgte «Fagblom» blant forslagene.

## Hva som ble testet og rettet
- **Feil i nedtelling:** under sommertid/vintertid-skiftet 25. oktober ble antall dager feil med én. Rettet ved å regne i kalenderdager, og lagt inn en test.
- **Sidelengs scroll og avklippet knapp på mobil:** funnet ved skjermbilder på flere skjermbredder og rettet.
- **Manuell logging:** negative minutter (f.eks. -3) ble stille gjort om til 1 minutt. Funnet av automatisk test, rettet slik at ugyldige tall avvises med en melding.
- **Sikkerhet:** importerte filer kontrolleres før de brukes (ugyldige farger, datoer og navn avvises), og all tekst vises som ren tekst slik at man ikke kan lime inn kode i et emnenavn. Dette er testet.
- **Poeng og butikk:** testet at man ikke kan kjøpe noe to ganger, kjøpe uten nok poeng eller ta på ting man ikke eier, at nivået ikke går ned når poeng brukes, og at ferdige oppgaver bare gir poeng én gang (ikke ved å huke av og på).
- **Sider og venner:** testet at menyen bytter side, at ukjente adresser gir oversikten, at studierekken regnes riktig (og brytes av en tom dag), at topplisten sorteres riktig og at demovenner alltid er merket.
- 136 automatiske tester og 30 tester i ekte nettleser består.

## Hva jeg selv bestemte
- Ideen og funksjoner som skulle være med (AI kom med forslag, men jeg kom med mine egne idéer)
- Utseendet (jeg avviste flere versjoner)
- At appen skulle bygges ut med profil og venner, og at vennedelen skulle være en demo
- Hva som skulle være med i dyr-/poengdelen, hvilke dyr som skulle være med, og at de skulle vokse fra baby til gammel

## Refleksjon
Å jobbe med AI gikk mye raskere enn jeg hadde forventet. Jeg la inn ideene mine, og AI-en hjalp meg å utvikle dem, skrev koden og spurte hvordan jeg ønsket at ting skulle se ut. Imidlertid måtte jeg flere ganger rette og be om endringer, fordi den ikke alltid forsto hva jeg mente. Da handlet det mest om å være mer spesifikk. Utseendet tok flere forsøk og jeg måtte avvise flere design før jeg endte opp med det jeg ville ha.

AI-en lager ofte en mye enklere versjon enn det man egentlig ønsker. Den første versjonen av appen hadde for eksempel ikke timer, profil eller studiedyr, og jeg måtte be om dem. Hvis man vil ha flere funksjoner, slik en utvikler kanskje hadde laget selv, må man be om dem. Det er ikke nødvendigvis negativt, men man må vite at man må be om mer. Noen ganger ble det også slitsomt å snakke med AI-en når jeg ville ha små endringer. Jeg gikk for eksempel inn og endret litt på CSS, ettersom jeg ikke var helt fornøyd med hvordan det så ut til tider. 

Underveis sjekket jeg at appen fungerte ved å åpne den selv og se på resultatet. Siden så for eksempel helt uten stil ut hos meg i starten, og det ble rettet ved å legge alt i én fil i stedet for separate filer. Mobilversjonen likte jeg ikke, så den ble laget om helt. AI-en kjørte også automatiske tester, og de fant blant annet to feil som ble rettet: nedtellingen ble feil med én dag over sommertid, og manuell logging av negative minutter ble gjort om til 1 minutt.

Alt i alt mener jeg det er mye å lære fra en slik oppgave. Mange tenker nok man kan la AI-en gjøre alt, og bare sitte og vente på et fint resultat, men det er mye småpirk og tenking man må gjøre selv. Og å være så lite involvert i selve koden, slik som i en slik oppgave, mener jeg gjør det litt vanskeligere å lære noe av teorien selv. Likevel mener jeg det er en god erfaring å kunne utvikle en idé på denne måten.
