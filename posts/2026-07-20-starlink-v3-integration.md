---
title: "Starlink V3 and the integration moat: why the satellite isn't the point"
date: 2026-07-20
category: aerospace
---

# Starlink V3 and the integration moat: why the satellite isn't the point

SpaceX has been floating numbers for its third-generation Starlink satellites: on the order of **1 Tbps of downlink per satellite**, a tenfold jump over the V2 Mini it flies today. Treat that figure as *announced and to be confirmed* — SpaceX has not published a spec sheet, and the number circulates mostly through industry analysts. But the more interesting question isn't whether 1 Tbps is real. It's what the number actually measures, and what it tells you about why nobody else is close.

I build small satellites, so I read these claims from the side of the vehicle, not the stock ticker.

## What the number really means

Start with the honest baseline. Starlink's own Gen2 documentation states the V2 Mini carries **roughly four times the capacity of the V1.x satellites** — and the V1.x birds did about 20 Gbps, which puts the V2 Mini at ~80–96 Gbps downlink per satellite. That part is on the record.

The jump to ~1 Tbps is best read as **aggregate capacity**, not a single user flow. A typical Starlink "cell" uses around 250 MHz of spectrum and delivers about 1 Gbps under good conditions — so 1 Tbps is the sum of roughly a thousand simultaneous beams to different users, not one 1-Tbps pipe to your dish. That distinction matters: it means the headline is a statement about *network density*, not antenna power.

Where does the aggregate come from? Three things, none of them magic:

- **More spectrum.** SpaceX's V3 FCC filing asks to add V- and E-band to the existing Ku/Ka allocation. More band means more capacity to spread across beams.
- **A bigger bus.** A larger spacecraft carries more solar array, which means more power for the phased-array antennas.
- **An optical backbone that doesn't collapse.** Each V2 Mini already carries three inter-satellite laser links at up to ~200 Gbps each. Those lasers aren't the link to your terminal — they're the satellite-to-satellite mesh that lets 1 Tbps of user beams actually reach the ground without bottlenecking on gateway stations.

So the optical communications people point to as the source of the leap are real, but they are the *backbone*, not the user link. They are what make the aggregation *sustainable*.

## An architectural jump, not a scaling one

Here's the part you only see if you've wrestled with a flight bus yourself. The V3 capabilities are not a matter of "same satellite, bigger panel." They are an **architectural** requirement.

On a PocketQube — the class I work with — none of this fits. The avionics, the power budget, the attitude control for a stable phased-array footprint: there simply isn't the volume. You could maybe contemplate it on a CubeSat, and even there you'd be trading hard. Miniaturizing the optics and the RF to that footprint is possible *only at a cost* — smaller, higher-performance components are more expensive per unit, and the integration margin shrinks.

And notice the direction SpaceX actually chose: across iterations, the satellites have **gotten larger**, not smaller. They didn't try to compress the vehicle. They made the bus bigger and leaned on a cheap heavy-lift launcher to make that economical. That's a deliberate bet — and it's the bet that only works if you control the rocket.

## A temporary moat

Which leads to the uncomfortable (and honest) conclusion: the advantage isn't "big beats small" forever.

If electronics keep miniaturizing while holding performance — the same trend that shrank a phone into a pocket — then a smaller spacecraft at equal capability eventually wins, because less mass means cheaper launches means more satellites means more aggregate capacity. Miniaturization that preserves performance only helps. The trade-off I described is real *today*, because the miniaturization still costs money and margin. But it's a moving target.

So the moat right now is temporal, not physical: **at the current state of the art, the only economical way to get that performance is a large bus, and the only economical way to fly a large bus often is to own the launch cadence.** Tomorrow, the edge may shift to whoever learns to do it small.

## The real advantage is the integrated system

Step back from the satellite and the moat clarifies. What SpaceX actually has is a **vertically integrated pipeline** — it builds the satellite, builds the rocket, and flies them on a cadence no competitor matches. Falcon 9 alone is already a serious machine; Starship, once it sustains a continuous throughput of mega-rockets, will reshuffle the market entirely.

But the deeper point is the *factory*, not the launcher. A competitor can buy or build a heavy lifter. What it can't quickly copy is a production line that integrates and qualifies satellites at volume, then commissions them into orbit on a weekly rhythm. That's an industrial-organizational problem, not a hardware one.

Europe is behind here — not because it lacks rockets, but because it lacks the *integrated system* from production to orbit. That said, the continent isn't starting from zero: **Isar Aerospace**, **RFA**, **PLD Space** (with its Miura 5 orbital vehicle) and others are building out independent small- and medium-lift capacity. The honest caveat is that none of them is designed for Starship-class cadence — they are periodic launchers, not a pipeline. Until the integration problem upstream is solved, programs like IRIS² risk remaining a string of disconnected launches rather than a coherent constellation.

## The cadence, in numbers

The "rapid iteration" isn't a slogan — it's visible in the deployment curve. Tracking by astronomer Jonathan McDowell puts the constellation at roughly 10,400 satellites in orbit by mid-2026, up from a standing start in 2019. Subscribers crossed 10 million in early 2026 after more than doubling during 2025.

<div class="chart" role="img" aria-label="Starlink satellites in orbit and subscribers, 2019 to 2026">
<svg viewBox="0 0 640 300" xmlns="http://www.w3.org/2000/svg" font-family="var(--font-mono)" font-size="11">
  <!-- grid -->
  <line x1="60" y1="20" x2="60" y2="260" stroke="#2B303A" stroke-width="1"/>
  <line x1="60" y1="260" x2="620" y2="260" stroke="#2B303A" stroke-width="1"/>
  <!-- satellites line (left axis, 0..11000) -->
  <polyline fill="none" stroke="#FFB000" stroke-width="2.5"
    points="60,254 143,238 226,214 309,182 392,150 475,116 558,28"/>
  <!-- subscribers line (right axis, 0..10M, scaled to same height) -->
  <polyline fill="none" stroke="#6F93AC" stroke-width="2" stroke-dasharray="4 3"
    points="60,259 143,257 226,254 309,245 392,228 475,196 558,178"/>
  <!-- x labels -->
  <g fill="#9BA1AB">
    <text x="55" y="275">19</text>
    <text x="138" y="275">20</text>
    <text x="221" y="275">21</text>
    <text x="304" y="275">22</text>
    <text x="387" y="275">23</text>
    <text x="470" y="275">24</text>
    <text x="553" y="275">25</text>
    <text x="600" y="275">26</text>
  </g>
  <!-- legend -->
  <g font-size="10">
    <rect x="60" y="40" width="12" height="3" fill="#FFB000"/>
    <text x="78" y="44" fill="#FFB000">sats in orbit (~10.4k, 2026)</text>
    <rect x="60" y="56" width="12" height="3" fill="#6F93AC"/>
    <text x="78" y="60" fill="#6F93AC">subs (~10M, 2026)</text>
  </g>
</svg>
</div>

*Sources: Jonathan McDowell / planet4589.org (constellation counts, via space.com); analyst estimates for subscriber milestones. Figures are approximate and partly modelled.*

## The game is "who owns the current bottleneck"

The V3 is a consequence, not a cause. Starlink leads because it stacked an integrated factory, a owned launcher, and a weekly cadence — and because iterating on that system for years let it push performance that smaller buses can't yet hold at acceptable cost.

The real lesson for anyone building in this space: the winner isn't the one with the most powerful satellite. It's the one who controls whichever constraint is binding *right now* — today, that's integration from factory to orbit. Tomorrow, it may be the ability to do it small.
