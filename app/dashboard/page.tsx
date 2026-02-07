"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { collection, query, onSnapshot, orderBy, Timestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Send, LogOut, Cpu, Users, Plus, Shield, Zap, Target, Maximize2, X } from "lucide-react";
import MermaidChart from "@/components/MermaidChart";
import { getUserTeams, Team, getTeamMembers, TeamMember, addMemberToTeam, createTeam } from "@/lib/teams";
import TeamModal from "@/components/TeamModal";
import LiveFeed from "@/components/LiveFeed";
import OperativeModal from "@/components/OperativeModal";

// Type definition for Project
interface Project {
    id: string;
    inputContext: string;
    status: "generating" | "completed" | "error";
    output?: any;
    createdAt: any;
}

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    // UI States
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [inputContext, setInputContext] = useState("");
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [addMemberId, setAddMemberId] = useState("");
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

    // Operative Modal State
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [expandedChart, setExpandedChart] = useState<string | null>(null);

    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
            } else {
                setUser(currentUser);
                const userTeams = await getUserTeams(currentUser.uid);
                setTeams(userTeams);

                if (userTeams.length > 0) {
                    setCurrentTeam(userTeams[0]);
                } else {
                    setLoading(false); // No teams yet
                }
            }
        });
        return () => unsubscribe();
    }, [router]);

    // Fetch Members when Team Changes
    useEffect(() => {
        if (!currentTeam) return;

        const fetchMembers = async () => {
            const members = await getTeamMembers(currentTeam.members);
            setTeamMembers(members);
        };

        fetchMembers();

        // Listener for Team Updates (e.g. name change, new members)
        const unsubTeam = onSnapshot(doc(db, "teams", currentTeam.id), (doc) => {
            if (doc.exists()) {
                const updatedTeam = { id: doc.id, ...doc.data() } as Team;
                // If members changed, refetch details
                if (updatedTeam.members.length !== currentTeam.members.length) {
                    getTeamMembers(updatedTeam.members).then(setTeamMembers);
                }
            }
        });

        // Listener for Projects
        const q = query(
            collection(db, "teams", currentTeam.id, "projects"),
            orderBy("createdAt", "desc")
        );
        const unsubProjects = onSnapshot(q, (snapshot) => {
            const projs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Project[];
            setProjects(projs);
            setLoading(false);
        });

        return () => {
            unsubTeam();
            unsubProjects();
        };

    }, [currentTeam]);

    const handleTeamCreated = async () => {
        if (user) {
            const userTeams = await getUserTeams(user.uid);
            setTeams(userTeams);
            // Select the new team (last one)
            if (userTeams.length > 0) setCurrentTeam(userTeams[userTeams.length - 1]);
        }
    };

    const handleAddMember = async () => {
        if (!currentTeam || !user || !addMemberId.trim()) return;
        try {
            await addMemberToTeam(currentTeam.id, addMemberId, user.displayName || "Admin");
            setAddMemberId("");
            setIsAddMemberOpen(false);
            alert("Operative added to the roster.");
        } catch (e) {
            console.error(e);
            alert("Failed to add member. Check ID.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputContext.trim() || !user || !currentTeam) return;

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.uid,
                    userContext: inputContext,
                    teamId: currentTeam.id
                }),
            });
            if (!response.ok) throw new Error("API Failure");
            setInputContext("");
        } catch (error) {
            console.error("Submission Error", error);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/");
    };

    if (loading && !currentTeam && teams.length > 0) return <div className="min-h-screen bg-black flex items-center justify-center text-primary font-mono">INITIALIZING_WAR_ROOM...</div>;

    return (
        <div className="min-h-screen bg-background text-foreground font-mono flex flex-col md:flex-row h-screen overflow-hidden">

            {/* LEFT SIDEBAR navigation (Minimal) */}
            <div className="w-[60px] md:w-[80px] border-r border-white/10 bg-black flex flex-col items-center py-6 space-y-6 z-20">
                <div className="p-2 border border-primary/50 rounded bg-primary/10">
                    <Terminal className="w-6 h-6 text-primary" />
                </div>

                {/* Team Switcher Icons */}
                <div className="flex-1 space-y-4 w-full flex flex-col items-center">
                    {teams.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setCurrentTeam(t)}
                            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${currentTeam?.id === t.id ? 'border-primary bg-primary/20 text-white shadow-[0_0_10px_rgba(57,255,20,0.5)]' : 'border-white/20 text-muted-foreground hover:border-white/50'}`}
                            title={t.name}
                        >
                            {t.name.substring(0, 2).toUpperCase()}
                        </button>
                    ))}
                    <button onClick={() => setIsTeamModalOpen(true)} className="w-10 h-10 rounded-full border border-dashed border-white/30 text-white/50 hover:text-primary hover:border-primary flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                <button onClick={handleLogout} className="text-muted-foreground hover:text-red-500">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* GRID BACKGROUND */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                {/* TEAM HEADER */}
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-sm z-10">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            {currentTeam ? currentTeam.name : "NO_SQUAD_SELECTED"}
                        </h1>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            OP_STATUS: ACTIVE
                        </span>
                    </div>

                    <div className="flex items-center space-x-6">
                        {/* ROSTER */}
                        <div className="flex -space-x-2 items-center">
                            {teamMembers.map((m) => (
                                <button
                                    key={m.uid}
                                    onClick={() => setSelectedMember(m)}
                                    className="w-8 h-8 rounded-full border border-black bg-neutral-800 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:scale-110 transition-transform hover:z-10 hover:border-primary focus:outline-none"
                                    title={m.displayName}
                                >
                                    {m.photoURL ? (
                                        <img src={m.photoURL} alt={m.displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-bold text-white">{m.displayName.substring(0, 1)}</span>
                                    )}
                                </button>
                            ))}
                            <button
                                onClick={() => setIsAddMemberOpen(!isAddMemberOpen)}
                                className="w-8 h-8 rounded-full border border-dashed border-white/30 bg-black flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Add Member Popover Input (Quick Hack UI) */}
                        {isAddMemberOpen && (
                            <div className="absolute top-16 right-20 bg-black border border-primary/30 p-4 rounded shadow-xl flex gap-2 animate-in fade-in slide-in-from-top-2 z-30">
                                <input
                                    value={addMemberId}
                                    onChange={(e) => setAddMemberId(e.target.value)}
                                    placeholder="Operative ID..."
                                    className="bg-neutral-900 border border-white/20 rounded px-2 py-1 text-sm text-white focus:border-primary"
                                />
                                <button onClick={handleAddMember} className="bg-primary text-black px-3 py-1 rounded text-xs font-bold hover:bg-white">
                                    ADD
                                </button>
                            </div>
                        )}

                        <div className="text-right hidden md:block">
                            <div className="text-xs text-muted-foreground uppercase">Commander</div>
                            <div className="text-sm font-bold text-white">{user?.displayName || "Unknown"}</div>
                        </div>
                    </div>
                </header>

                {/* WORKSPACE CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 relative">
                    {/* INPUT SECTION */}
                    <section className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                                <Target className="w-5 h-5" /> MISSION_PARAMETERS
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-lg blur opacity-20 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative">
                                <textarea
                                    value={inputContext}
                                    onChange={(e) => setInputContext(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-lg p-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all min-h-[100px] resize-y"
                                    placeholder="Describe the mission objective"
                                />
                                <button
                                    type="submit"
                                    className="absolute bottom-4 right-4 bg-primary/10 border border-primary text-primary px-4 py-2 rounded text-xs font-bold hover:bg-primary hover:text-black transition-all flex items-center gap-2"
                                >
                                    <Send className="w-3 h-3" />
                                    <span>EXECUTE</span>
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* PROJECTS GRID */}
                    <div className="max-w-6xl mx-auto space-y-6">
                        <AnimatePresence>
                            {projects.map((project) => (
                                <motion.div
                                    key={project.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="border border-white/10 bg-black/40 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm"
                                >
                                    {/* Project Header */}
                                    <div className="bg-white/5 px-4 py-2 flex justify-between items-center border-b border-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                            <span className="font-mono text-xs text-muted-foreground uppercase">{project.id.slice(0, 8)}...</span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${project.status === "completed" ? "border-primary text-primary" : "border-yellow-500 text-yellow-500"
                                            }`}>
                                            {project.status.toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Project Content */}
                                    {project.status === "completed" && project.output && (
                                        <div className="grid grid-cols-1 gap-px bg-white/10">
                                            {/* Story Card */}
                                            <div className="bg-black/90 p-6 space-y-4">
                                                <h3 className="text-white font-black text-lg tracking-wider flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> THE_STORY</h3>
                                                <div className="text-xs leading-relaxed text-muted-foreground/80 space-y-2">
                                                    {typeof project.output.story === "string" ? project.output.story : (
                                                        <>
                                                            <p><strong className="text-white">PROBLEM:</strong> {project.output.story.problem}</p>
                                                            <p><strong className="text-white">SOLUTION:</strong> {project.output.story.solution}</p>
                                                            <p><strong className="text-white">TECH:</strong> {project.output.story.tech}</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Diagram Card */}
                                            <div className="bg-black/90 p-6 space-y-4 border-t border-white/10 relative group/chart">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-white font-black text-lg tracking-wider flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" /> ARCHITECTURE</h3>
                                                    <button
                                                        onClick={() => setExpandedChart(project.output.diagram)}
                                                        className="text-muted-foreground hover:text-white transition-colors"
                                                        title="Maximize Pattern"
                                                    >
                                                        <Maximize2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="h-48 overflow-hidden rounded border border-white/10 p-2 bg-[#0d1117] relative">
                                                    <MermaidChart chart={project.output.diagram || "graph TD; A[Client] --> B[Server];"} />
                                                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors pointer-events-none"></div>
                                                </div>
                                            </div>

                                            {/* Quests Card */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border-t border-white/10">
                                                {/* Quest Log (Takes 2/3 space) */}
                                                <div className="bg-black/90 p-6 space-y-4 md:col-span-2">
                                                    <h3 className="text-white font-black text-lg tracking-wider flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> QUEST_LOG</h3>
                                                    <ul className="space-y-2">
                                                        {(project.output.game_quests || []).map((q: any, i: number) => (
                                                            <li key={i} className="flex justify-between items-center text-xs border border-white/5 p-2 rounded hover:bg-white/5 transition-colors cursor-pointer group">
                                                                <span className="text-muted-foreground group-hover:text-white">{q.title}</span>
                                                                <span className="text-primary font-mono">{q.xp}XP</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Innovation Score (Takes 1/3 space) */}
                                                <div className="bg-black/90 p-6 space-y-6 flex flex-col justify-center items-center text-center relative overflow-hidden md:border-l border-white/10">
                                                    <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>

                                                    {/* Score Circle */}
                                                    <div className="relative z-10">
                                                        <h3 className="text-white font-black text-sm tracking-widest mb-4 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">INNOVATION_SCORE</h3>
                                                        <div className="w-24 h-24 rounded-full border-4 border-primary/30 flex items-center justify-center relative bg-black shadow-[0_0_30px_rgba(57,255,20,0.2)]">
                                                            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin duration-[3s]"></div>
                                                            <span className="text-3xl font-black text-primary drop-shadow-[0_0_10px_rgba(57,255,20,0.8)]">
                                                                {project.output.cheat_sheet?.innovation_score || "0"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Why It Wins */}
                                                    <div className="relative z-10 space-y-4 max-w-[240px] text-left">
                                                        <div className="h-px w-full bg-white/10"></div>
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">WHY IT WINS</p>
                                                        <ul className="space-y-2">
                                                            {Array.isArray(project.output.cheat_sheet?.why_it_wins) ? (
                                                                project.output.cheat_sheet.why_it_wins.map((reason: string, idx: number) => (
                                                                    <li key={idx} className="text-xs text-white font-medium leading-tight flex items-start gap-2">
                                                                        <span className="text-primary mt-0.5">›</span>
                                                                        <span>{reason}</span>
                                                                    </li>
                                                                ))
                                                            ) : (
                                                                (project.output.cheat_sheet?.why_it_wins || "N/A").split('. ').map((reason: string, idx: number) => (
                                                                    reason.trim() && (
                                                                        <li key={idx} className="text-xs text-white font-medium leading-tight flex items-start gap-2">
                                                                            <span className="text-primary mt-0.5">›</span>
                                                                            <span>{reason.endsWith('.') ? reason : reason + '.'}</span>
                                                                        </li>
                                                                    )
                                                                ))
                                                            )}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Pitch Script Section */}
                                            {project.output.pitch_script && Array.isArray(project.output.pitch_script) && (
                                                <div className="bg-black/90 p-6 space-y-4 border-t border-white/10">
                                                    <h3 className="text-white font-black text-lg tracking-wider flex items-center gap-2">
                                                        <Terminal className="w-5 h-5 text-primary" /> PITCH_SCRIPT_PROTOCOL [120s]
                                                    </h3>
                                                    <div className="space-y-3 bg-[#0d1117] p-4 rounded border border-white/5 font-mono text-xs md:text-sm">
                                                        {project.output.pitch_script.map((segment: any, idx: number) => (
                                                            <div key={idx} className="flex gap-4 group hover:bg-white/5 p-2 rounded transition-colors">
                                                                <span className="text-primary font-bold shrink-0 w-16 text-right">[{segment.time}]</span>
                                                                <span className="text-muted-foreground group-hover:text-white transition-colors">
                                                                    {segment.text}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Loading State */}
                                    {project.status === "generating" && (
                                        <div className="p-12 text-center space-y-4 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent,rgba(57,255,20,0.1),transparent)] animate-[shimmer_2s_infinite]"></div>
                                            <Cpu className="w-12 h-12 mx-auto text-primary animate-spin" />
                                            <p className="text-xs font-mono text-primary animate-pulse">ANALYZING_CODEBASE_VECTORS...</p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* LIVE FEED SIDEBAR (Right) */}
            <div className="w-[300px] hidden lg:block h-full border-l border-white/10 bg-black/80 backdrop-blur-md z-20">
                <LiveFeed teamId={currentTeam?.id} />
            </div>

            {/* MODAL */}
            <TeamModal
                isOpen={isTeamModalOpen}
                onClose={() => setIsTeamModalOpen(false)}
                userId={user?.uid || ""}
                onTeamJoined={handleTeamCreated}
            />

            <OperativeModal
                isOpen={!!selectedMember}
                onClose={() => setSelectedMember(null)}
                member={selectedMember}
            />

            {/* EXPANDED CHART MODAL */}
            <AnimatePresence>
                {expandedChart && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md"
                        onClick={() => setExpandedChart(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-[#0d1117] border border-white/20 rounded-xl w-full max-w-6xl h-[80vh] flex flex-col shadow-2xl overflow-hidden relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <Cpu className="w-5 h-5 text-primary" /> SYSTEM_ARCHITECTURE_VIEW
                                </h3>
                                <button
                                    onClick={() => setExpandedChart(null)}
                                    className="text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-8 bg-[radial-gradient(circle_at_center,#1a1a1a_1px,transparent_1px)] bg-[size:20px_20px]">
                                <div className="min-w-full min-h-full flex items-center justify-center">
                                    <MermaidChart chart={expandedChart} />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
