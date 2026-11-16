# Page template and writing rules

One page per screen, in the reader's words, in this order:

1. **Title**: the screen's own title, as the app shows it.
2. **How to get there**: the menu path (`Ventes › Clients`).
3. **Overview capture** at 1440 px.
4. **What it is for**: two or three sentences, the job the reader gets done here.
5. **Who can use it**: from the role checks in the code (route guard, menu visibility, database
   rules). Never guessed.
6. **Step by step**: numbered steps, one action per step, each with its capture where the element
   is framed with the same number. The action happens after the capture: the next capture shows the
   result.
7. **Fields and rules**: each field with what it accepts and its rule (required, format, limits),
   taken from the validation code and the labels.
8. **Common problems**: the error messages the screen can show and what to do, taken from the code.
   An empty state counts.
9. **On a phone**: the 390 px capture, when the screen is used on the move.
10. **See also**: the screens before and after in the usual flow.

Writing rules:
- Second person, present tense, short sentences: "Choisissez un client dans la liste."
- Use the exact labels of the screen in quotes: « Nouvelle facture ».
- Never describe a button the reader cannot see with their role.
- A screen that shows demonstration data says so in one sentence.
- No adjectives about the software ("simple", "puissant"): say what it does.
- Anything not proven by the code or the capture is written "À compléter" until it is.
