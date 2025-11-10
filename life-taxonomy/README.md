# Marine Life Taxonomy + Functional Groups

This bundle contains:
- `taxonomy/taxonomy.json` — a compact marine-focused taxonomy tree (domain → kingdom → phylum → class → genus → species).
- `groups/*.json` — diver-facing functional groups (e.g. sharks, rays, reef-fish) each with:
  - a `group` object describing the concept, and
  - an `entries` array with representative species and dive-relevant metadata.

All IDs use `kebab-case` and are generally singular:
- `group-id`: e.g. `shark`, `reef-fish`
- `taxon-id`: e.g. `chondrichthyes`, `rhincodon-typus`
- `entry.id`: e.g. `hammerhead`, `whale-shark`

You can:
- Use `taxonomy.json` as the canonical tree for scientific lookup and lineage.
- Use `groups/*.json` as your diver-friendly UI layer and tagging system.
- Link the two via `taxon-id` on each species entry.


In general categorizing life for divers is hard. It does mean dealing with both **scientific taxonomy** and **experiential perception**. Traditional biological classification (domain, kingdom, phylum, class, order, family, genus, species) captures the evolutionary relationships among organisms and allows for precision, but it’s not always intuitive. Divers tend to think in terms of *encounter categories*: sharks, macro life, reef fish, corals, pelagics. Humans in general tend to use voluntary or folk classification rather than formal directed acyclic graphs (Lakoff). These colloquial groupings cut across scientific boundaries, mixing taxa that share ecological roles, behaviors, or visual appeal. Convergent evolution functional roles in ecosystem or trophic niches can belie genetic ancestry. Effectively genetic history is in some ways a less useful mapping than ecosystem niche (see https://www.amazon.com/Origin-Nature-Life-Earth-Emergence/dp/1009633775 ). Our approach is therefore to start with a structured taxonomy and then create a concept of **functional groups** that map better to colloquial understanding. A diver doesn’t need to know that manta rays and hammerhead sharks are both in *Chondrichthyes* - what matters is that they’re both large, charismatic, pelagic animals likely to be seen in blue water. A nudibranch and a cuttlefish may share a habitat and may pose for the camera, but they come from entirely different phyla (*Mollusca* and *Cephalopoda* respectively).