# Module 2: Tools on vs. tools off

_Fictional — for educational use._

**Your name:** Dylan Rose

Ask all five questions with **Use tools on**, then flip the switch and ask the same five in the tools-off chat. (They're separate conversations, so Copper can't copy its own answers.) Find each answer's cost and time in the terminal running `npm run dev`: every call prints a line starting `[ai_calls]` with its tokens, cost and time.

## The five test questions

| # | Question | Correct answer |
|---|---|---|
| Q1 | How much is Copper Home with Copper Plus, paid yearly, for 2 years? | $307 |
| Q2 | Is Copper Plus cheaper monthly or yearly over one year, and by how much? | Yearly, by $16.88 ($79 vs. $95.88) |
| Q3 | Is Copper Notes in Night Sky in stock? | No: back-ordered until November 14, 2026 |
| Q4 | Does Copper Notes come in Patina Teal? | No. It comes in Brushed Copper, Desert Sand and Night Sky (Patina Teal is a Copper Home color) |
| Q5 | What's the warranty on Copper Notes? | Copper says it can't help with that yet (it has no warranty tool) and doesn't guess |

## 1. Results table

Mark each answer ✅ (correct) or ❌ (wrong). Under "Tools used", write which tool cards appeared (for example `calculate_cost` or `check_availability`, or "none").

All runs used Gemini 3 Flash (`google/gemini-3-flash`). Costs and times are from the `[ai_calls]` lines.

| Question | Tools on: right? | Tools used | Cost | Time | Tools off: right? | Cost | Time |
|---|---|---|---|---|---|---|---|
| Q1 | ✅ | `calculate_cost` | $0.00101 | 2.2 s | ❌ | $0.00671 | 12.4 s |
| Q2 | ✅ | `get_prices` | $0.00103 | 1.9 s | ❌ | $0.00156 | 2.6 s |
| Q3 | ✅ | `check_availability` | $0.00107 | 1.9 s | ❌ | $0.00163 | 3.6 s |
| Q4 | ✅ | `get_products` | $0.00089 | 2.0 s | ❌ | $0.00166 | 2.9 s |
| Q5 | ✅ | none | $0.00052 | 3.0 s | ❌ | $0.00221 | 3.7 s |
| **Total** | **5 / 5** | | $0.0045 | 11.0 s | **0 / 5** | $0.0138 | 25.2 s |

Notes on the runs:

- Q2 with tools on: Copper called `get_prices` and worked out the $16.88 difference itself, instead of calling `calculate_cost`. The answer was right, but my instructions say to use `calculate_cost` for totals, so the model didn't follow them exactly.
- Q4 with tools on: my first two attempts printed "Sorry, I couldn't answer that". The first was a provider error after about 14 seconds (the log shows `ok: false` and no tokens). The second failed because my own apology message was being sent back to the model as if Copper had said it. I fixed that (only finished answers are sent back as history) and a clean chat answered correctly. The row above is from that clean run.
- Q5 with tools on: Copper did not call any tool, so the cost is lower than the other rows.

## 2. Reading the steps

Pick one answer where Copper used a tool. Copy out:

- **What Copper was thinking** (the thinking station, in its own words):

> No thinking station appeared with tools on. Gemini 3 Flash went straight to the tool call without writing a thought summary for any of the five tools-on questions. (The course's other model, Gemini 2.5 Flash, always writes one, but Google no longer offers it to new keys, so I used Gemini 3 Flash.) The thinking I quote in section 4 is from the tools-off chat.

- **What Copper sent** to the tool, and **what came back**:

> Q1, `calculate_cost`. Sent: Products = Copper Home, Plan = Copper Plus, Billing = annual, Years = 2. Came back: Copper Home $149; Copper Plus, paid yearly, 2 years $158; Total $307.

Did the model pick the right inputs? How would you know if it hadn't? (2–4 sentences)

> Yes. The sent card lists exactly one Copper Home, the Copper Plus plan, annual billing and 2 years, which is what the question asked, and the total ($149 + 2 × $79 = $307) matches my own arithmetic. If it had picked wrong inputs, the "What Copper sent" card would show it (for example Years = 1, or Billing = monthly), and the lines and total would not match what I expected. The card is how I can check the work instead of trusting the reply.

## 3. Live stock

1. Open `lib/copper/data/inventory.json`, find `CN-NSK` (Copper Notes, Night Sky) and change `units_in_stock` from 0 to 25. Save.
2. Reload the page and ask Q3 again, with tools on.
3. Change it back to 0 when you're done.

What did Copper say this time? Did you change any code or instructions? (2–3 sentences)

> Copper called `check_availability`, the card showed Night Sky as "In stock", and the reply said "Yes, the Copper Notes in Night Sky is in stock." I changed no code and no instructions, only the number in the stock list, because the tool reads the stock list fresh every time. I changed it back to 0 afterwards and confirmed with Git that the file matches the original.

## 4. Tools off

Copper still thinks out loud in the tools-off chat. Find a question where it got the price wrong and copy out its thinking:

> From Q1, tools off: "I've determined that "Copper + Plus" costs $110.04 annually, totalling $220.08 over two years." Earlier in the same thinking it says "It's seeming like the reference is to Copper (the banking app)" and "Currently, there is no "Copper Home with Copper Plus"." It then states the $220.08 as fact in its reply.

What happened when Copper had no tools? Which answers changed, and why can't a model know prices or today's stock without them? (3–5 sentences)

> With no tools, all five answers were wrong (0 of 5, against 5 of 5 with tools). For Q1 and Q2 it invented prices ($220.08, and a $33.36 saving) by mixing Copper State Labs up with a "Copper" banking app. For Q3 and Q4 it decided "Copper Notes" was a stationery brand and said Patina Teal exists, and for Q5 it made up a warranty policy. A model only knows what it learned in training, which doesn't include Copper State Labs' current prices or today's stock, so with nothing to look up it fills the gap with something that sounds right. Q5 is the one case where the tools-on chat also had no tool, but the instructions told Copper to decline and point to the Copper Crew, and it did.

## 5. Risk

What could still go wrong with Ask Copper, even with tools? What do the tools protect against, and what don't they? Who at Copper should be responsible for it?

> The tools protect against made-up prices, totals, colors and stock, because those numbers come from the catalog and the stock list. They don't protect against the model ignoring its instructions (in Q2 it did the subtraction itself instead of using `calculate_cost`), a provider outage (my Q4 failure), or a stale stock list: the tool reports whatever the list says, so if the list is wrong, Copper will confidently be wrong too. A shopper could also still ask about warranty or privacy, and a model without a tool could guess, so the instructions have to keep it in scope. I think the owner should be the head of Customer Experience (Elena Vargas) together with the Copper Crew lead (Marcus Lee), with engineering responsible for keeping the tools and stock data correct and for watching the logged errors and costs.

## 6. Reflection

What surprised you? What's one thing you'd change about Ask Copper next?

> What surprised me most was how confident the tools-off answers sounded while being completely wrong, and that the model's own thinking admitted it couldn't find the product ("there is no Copper Home with Copper Plus") and then answered anyway. I was also surprised that tools-on answers were much cheaper and faster than tools-off ones. One thing I'd change: show shoppers a clear message when the model provider fails, instead of a generic apology, and log the real error so it can be fixed.
