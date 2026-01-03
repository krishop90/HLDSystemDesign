!pip install -q graphviz

from graphviz import Digraph

dot = Digraph(
    "Rahul_Maheshwari_LinkedIn_Influencer_LLD",
    format="png"
)

# ==========================
# GLOBAL DARK THEME
# ==========================
dot.attr(
    rankdir="TB",
    bgcolor="#0b0f1a",
    fontcolor="white",
    fontsize="12",
    label="Rahul Maheshwari – LinkedIn Influencer (LLD Architecture)",
    labelloc="t"
)

dot.attr(
    "node",
    fontcolor="white",
    style="filled",
    color="white",
    penwidth="2"
)

dot.attr(
    "edge",
    color="white",
    penwidth="2.5",
    arrowsize="1.5",
    fontcolor="white"
)

# ==========================
# IDENTITY LAYER
# ==========================
with dot.subgraph(name="cluster_identity") as c:
    c.attr(label="Personal Identity Layer", color="white")

    c.node("Vision", "Vision\nTech + Community", fillcolor="#1e293b")
    c.node("Values", "Core Values\nAuthenticity & Growth", fillcolor="#1e293b")
    c.node("Consistency", "Consistency\nDiscipline & Presence", fillcolor="#1e293b")

# ==========================
# CONTENT ENGINE
# ==========================
with dot.subgraph(name="cluster_content") as c:
    c.attr(label="Content Creation Engine", color="white")

    c.node("Ideas", "Idea Generation\nExperience + Trends", fillcolor="#312e81")
    c.node("Content", "Content Creation\nPosts | Insights", fillcolor="#312e81")
    c.node("Storytelling", "Clear Storytelling", fillcolor="#312e81")

# ==========================
# DISTRIBUTION SYSTEM
# ==========================
with dot.subgraph(name="cluster_distribution") as c:
    c.attr(label="Distribution & Reach", color="white")

    c.node("Timing", "Posting Strategy\nTiming & Frequency", fillcolor="#064e3b")
    c.node("LinkedIn", "LinkedIn Algorithm", fillcolor="#064e3b")
    c.node("Visibility", "Audience Visibility", fillcolor="#064e3b")

# ==========================
# COMMUNITY & TRUST
# ==========================
with dot.subgraph(name="cluster_community") as c:
    c.attr(label="Community & Trust", color="white")

    c.node("Engagement", "Engagement\nComments | DMs", fillcolor="#7c2d12")
    c.node("Trust", "Trust Building", fillcolor="#7c2d12")
    c.node("Community", "Developer Community", fillcolor="#7c2d12")

# ==========================
# IMPACT LAYER
# ==========================
with dot.subgraph(name="cluster_impact") as c:
    c.attr(label="Influence & Impact", color="white")

    c.node("Authority", "Thought Leadership", fillcolor="#4c1d95")
    c.node("Opportunities", "Opportunities\nTalks | Projects", fillcolor="#4c1d95")
    c.node("Growth", "Personal + Community Growth", fillcolor="#4c1d95")

# ==========================
# FINAL STATE (NAMED)
# ==========================
dot.node(
    "Rahul",
    "Rahul Maheshwari\nLinkedIn Influencer\n(Value × Trust × Consistency)",
    shape="doubleoctagon",
    fillcolor="#991b1b",
    penwidth="3"
)

# ==========================
# MAIN FLOW
# ==========================
dot.edge("Vision", "Values")
dot.edge("Values", "Consistency")

dot.edge("Consistency", "Ideas")
dot.edge("Ideas", "Content")
dot.edge("Content", "Storytelling")

dot.edge("Storytelling", "Timing")
dot.edge("Timing", "LinkedIn")
dot.edge("LinkedIn", "Visibility")

dot.edge("Visibility", "Engagement")
dot.edge("Engagement", "Trust")
dot.edge("Trust", "Community")

dot.edge("Community", "Authority")
dot.edge("Authority", "Opportunities")
dot.edge("Opportunities", "Growth")

dot.edge("Growth", "Rahul")

# ==========================
# FEEDBACK LOOPS
# ==========================
dot.edge("Engagement", "Ideas", label="Audience Feedback", style="dashed")
dot.edge("Trust", "Storytelling", label="Authenticity Loop", style="dashed")
dot.edge("Growth", "Vision", label="Purpose Reinforcement", style="dashed")
dot.edge("LinkedIn", "Content", label="Algorithm Signals", style="dashed")

dot
