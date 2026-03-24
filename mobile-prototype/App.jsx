/**
 * ToonFlow Mobile — AI 短剧工厂移动版原型
 * React Native / Expo 风格 JSX
 *
 * 5 个主 Tab: 首页 / 创作 / 项目 / 资产 / 我的
 * 核心流程: 一句话创作 → 项目管理 → 剧集浏览 → 视频预览
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Image, FlatList, StyleSheet, StatusBar, SafeAreaView,
  Modal, Dimensions, ActivityIndicator,
} from 'react-native';

const { width: W, height: H } = Dimensions.get('window');
const COLORS = {
  bg: '#0D0D12', card: '#1A1A24', accent: '#8B5CF6', accentLight: '#A78BFA',
  success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
  text: '#F0F0F5', textSec: '#8888A0', border: '#2A2A3A',
  gradient1: '#7C3AED', gradient2: '#EC4899',
};

// ==================== Tab Bar ====================
function TabBar({ active, onTab }) {
  const tabs = [
    { key: 'home', icon: '🏠', label: '首页' },
    { key: 'create', icon: '✨', label: '创作' },
    { key: 'projects', icon: '📁', label: '项目' },
    { key: 'assets', icon: '🎨', label: '资产' },
    { key: 'profile', icon: '👤', label: '我的' },
  ];
  return (
    <View style={s.tabBar}>
      {tabs.map(t => (
        <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => onTab(t.key)}>
          <Text style={[s.tabIcon, active === t.key && s.tabActive]}>{t.icon}</Text>
          <Text style={[s.tabLabel, active === t.key && { color: COLORS.accent }]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ==================== 首页 Tab ====================
function HomeScreen({ onNavigate }) {
  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>你好，创作者 👋</Text>
          <Text style={s.subtitle}>今天想创作什么？</Text>
        </View>
        <TouchableOpacity style={s.avatarBtn}>
          <Text style={{ fontSize: 28 }}>🎬</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Create */}
      <TouchableOpacity style={s.quickCreate} onPress={() => onNavigate('create')}>
        <View style={s.quickCreateBg}>
          <Text style={s.quickCreateIcon}>✨</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.quickCreateTitle}>一句话生成剧本</Text>
            <Text style={s.quickCreateDesc}>输入灵感，AI 自动生成完整短剧项目</Text>
          </View>
          <Text style={{ color: COLORS.accent, fontSize: 20 }}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Stats Cards */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { borderLeftColor: COLORS.accent }]}>
          <Text style={s.statNum}>3</Text>
          <Text style={s.statLabel}>进行中</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: COLORS.success }]}>
          <Text style={s.statNum}>12</Text>
          <Text style={s.statLabel}>已完成</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: COLORS.warning }]}>
          <Text style={s.statNum}>164</Text>
          <Text style={s.statLabel}>分镜</Text>
        </View>
      </View>

      {/* Recent Projects */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>最近项目</Text>
          <TouchableOpacity><Text style={s.seeAll}>查看全部</Text></TouchableOpacity>
        </View>
        {[
          { id: 1, name: '凤凰涅槃', style: '龙族传说', eps: 10, progress: 85 },
          { id: 2, name: '酒吧情缘', style: '真人写实', eps: 5, progress: 30 },
          { id: 3, name: 'TWHISKY: 夜色觉醒', style: '赛博朋克', eps: 8, progress: 0 },
        ].map(p => (
          <TouchableOpacity key={p.id} style={s.projectCard}>
            <View style={s.projectThumb}>
              <Text style={{ fontSize: 32 }}>🎬</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.projectName}>{p.name}</Text>
              <Text style={s.projectMeta}>{p.style} · {p.eps}集</Text>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${p.progress}%`, backgroundColor: p.progress > 60 ? COLORS.success : COLORS.accent }]} />
              </View>
            </View>
            <Text style={s.projectPercent}>{p.progress}%</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pipeline Status */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>流水线状态</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {['故事线', '大纲', '剧本', '资产', '分镜', '图片', '视频', '配音', '合成'].map((stage, i) => (
            <View key={stage} style={[s.pipelineStage, i < 5 ? s.pipelineDone : i === 5 ? s.pipelineCurrent : s.pipelinePending]}>
              <Text style={s.pipelineIcon}>{i < 5 ? '✅' : i === 5 ? '⏳' : '⬜'}</Text>
              <Text style={s.pipelineLabel}>{stage}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ==================== 创作 Tab ====================
function CreateScreen() {
  const [idea, setIdea] = useState('');
  const [episodes, setEpisodes] = useState(5);
  const [style, setStyle] = useState('龙族传说');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState([]);

  const styles = ['2D动漫', '真人写实', '3D国创', '龙族传说', '吉卜力', '赛博朋克', '韩式厚涂', '暗黑奇幻'];
  const epOptions = [3, 5, 8, 10];

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      <Text style={s.pageTitle}>✨ 创作工作台</Text>

      {/* Idea Input */}
      <View style={s.inputSection}>
        <Text style={s.inputLabel}>你的灵感</Text>
        <TextInput
          style={s.ideaInput}
          placeholder="一个调酒师和失恋女孩在酒吧相遇的故事..."
          placeholderTextColor={COLORS.textSec}
          multiline
          numberOfLines={4}
          value={idea}
          onChangeText={setIdea}
        />
        <Text style={s.charCount}>{idea.length}/500</Text>
      </View>

      {/* Style Selector */}
      <View style={s.inputSection}>
        <Text style={s.inputLabel}>画面风格</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {styles.map(st => (
            <TouchableOpacity
              key={st}
              style={[s.styleChip, style === st && s.styleChipActive]}
              onPress={() => setStyle(st)}
            >
              <Text style={[s.styleChipText, style === st && { color: '#fff' }]}>{st}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Episode Count */}
      <View style={s.inputSection}>
        <Text style={s.inputLabel}>集数</Text>
        <View style={s.epRow}>
          {epOptions.map(n => (
            <TouchableOpacity
              key={n}
              style={[s.epBtn, episodes === n && s.epBtnActive]}
              onPress={() => setEpisodes(n)}
            >
              <Text style={[s.epBtnText, episodes === n && { color: '#fff' }]}>{n}集</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Type Selector */}
      <View style={s.inputSection}>
        <Text style={s.inputLabel}>题材类型</Text>
        <View style={s.epRow}>
          {['言情', '仙侠', '悬疑', '都市', '科幻', '喜剧'].map(t => (
            <TouchableOpacity key={t} style={s.typeChip}>
              <Text style={s.typeChipText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[s.generateBtn, !idea && s.generateBtnDisabled]}
        disabled={!idea || generating}
        onPress={() => setGenerating(true)}
      >
        {generating ? (
          <View style={s.genRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={s.generateBtnText}>  AI 创作中...</Text>
          </View>
        ) : (
          <Text style={s.generateBtnText}>🚀 开始创作</Text>
        )}
      </TouchableOpacity>

      {/* Progress Steps (when generating) */}
      {generating && (
        <View style={s.progressSection}>
          {[
            { stage: '创建项目', done: true },
            { stage: '生成故事线', done: true },
            { stage: '生成大纲 (5集)', done: false, current: true },
            { stage: '生成剧本', done: false },
            { stage: '提取角色/场景/道具', done: false },
          ].map((step, i) => (
            <View key={i} style={s.progressStep}>
              <View style={[s.progressDot, step.done && s.progressDotDone, step.current && s.progressDotCurrent]} />
              <Text style={[s.progressText, step.done && { color: COLORS.success }]}>
                {step.done ? '✅ ' : step.current ? '⏳ ' : '⬜ '}{step.stage}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// ==================== 项目详情 ====================
function ProjectDetailScreen() {
  const [activeEp, setActiveEp] = useState(1);
  const [activeTab, setActiveTab] = useState('script');

  return (
    <ScrollView style={s.screen}>
      {/* Project Header */}
      <View style={s.projectDetailHeader}>
        <Text style={s.projectDetailTitle}>凤凰涅槃</Text>
        <Text style={s.projectDetailMeta}>龙族传说 · 10集 · 16:9</Text>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: '85%', backgroundColor: COLORS.success }]} />
        </View>
      </View>

      {/* Episode Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.epTabs}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(ep => (
          <TouchableOpacity
            key={ep}
            style={[s.epTab, activeEp === ep && s.epTabActive]}
            onPress={() => setActiveEp(ep)}
          >
            <Text style={[s.epTabText, activeEp === ep && { color: '#fff' }]}>第{ep}集</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content Tabs */}
      <View style={s.contentTabs}>
        {[
          { key: 'script', label: '📝 剧本' },
          { key: 'storyboard', label: '🎬 分镜' },
          { key: 'video', label: '📹 视频' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.contentTab, activeTab === tab.key && s.contentTabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[s.contentTabText, activeTab === tab.key && { color: COLORS.accent }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Script View */}
      {activeTab === 'script' && (
        <View style={s.scriptView}>
          <Text style={s.scriptLine}>※ 天宫陵水殿 — 蟠桃宴正午</Text>
          <Text style={s.scriptLine}>$ 洛轻云、洛芷昀、天帝、众仙、鸾鸟族长、族后</Text>
          <Text style={s.scriptBgm}>【环境音：仙乐缥缈，丝竹悠扬，百鸟清鸣】</Text>
          <Text style={s.scriptBgm}>【BGM: 华美空灵，暗藏冷调】</Text>
          <Text style={s.scriptDialogue}>洛芷昀：「三界万年方出一只凤凰，姐姐的命格，可真是...令人艳羡。」</Text>
          <Text style={s.scriptAction}>(洛轻云低头不语，手指微微发抖)</Text>
          <Text style={s.scriptLine}>洛轻云蜷缩在金砖角落，浅青色仙裙袖口磨损起毛...</Text>
        </View>
      )}

      {/* Storyboard View */}
      {activeTab === 'storyboard' && (
        <View style={s.storyboardGrid}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={s.shotCard}>
              <View style={s.shotThumb}>
                <Text style={{ fontSize: 24 }}>🎥</Text>
              </View>
              <Text style={s.shotLabel}>S{Math.floor(i / 2) + 1}-镜头{(i % 2) + 1}</Text>
              <Text style={s.shotDuration}>{3 + i}s · {['特写', '全景', '中景', '过肩', '俯拍', '主观'][i]}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Video View */}
      {activeTab === 'video' && (
        <View style={s.videoSection}>
          <View style={s.videoPlayer}>
            <Text style={{ fontSize: 48, color: COLORS.textSec }}>▶️</Text>
            <Text style={s.videoDuration}>01:26</Text>
          </View>
          <View style={s.videoActions}>
            <TouchableOpacity style={s.videoBtn}><Text style={s.videoBtnText}>🔄 重新生成</Text></TouchableOpacity>
            <TouchableOpacity style={[s.videoBtn, { backgroundColor: COLORS.accent }]}><Text style={[s.videoBtnText, { color: '#fff' }]}>📤 导出</Text></TouchableOpacity>
          </View>
          <View style={s.videoTimeline}>
            {Array.from({ length: 8 }, (_, i) => (
              <View key={i} style={s.timelineBlock}>
                <Text style={s.timelineLabel}>S{i + 1}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ==================== 资产 Tab ====================
function AssetsScreen() {
  const [filter, setFilter] = useState('all');
  const filters = [
    { key: 'all', label: '全部' },
    { key: '角色', label: '🧑 角色' },
    { key: '场景', label: '🏞️ 场景' },
    { key: '道具', label: '⚔️ 道具' },
  ];

  const assets = [
    { id: 1, name: '洛轻云', type: '角色', desc: '凤凰女主' },
    { id: 2, name: '萧君陌', type: '角色', desc: '太子殿下' },
    { id: 3, name: '天宫陵水殿', type: '场景', desc: '金碧辉煌' },
    { id: 4, name: '凤凰金羽剑', type: '道具', desc: '凤凰神器' },
    { id: 5, name: '洛芷昀', type: '角色', desc: '假凤凰' },
    { id: 6, name: '东海龙宫', type: '场景', desc: '水下宫殿' },
  ];

  const filtered = filter === 'all' ? assets : assets.filter(a => a.type === filter);

  return (
    <ScrollView style={s.screen}>
      <Text style={s.pageTitle}>🎨 资产库</Text>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterChipText, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Asset Grid */}
      <View style={s.assetGrid}>
        {filtered.map(a => (
          <TouchableOpacity key={a.id} style={s.assetCard}>
            <View style={s.assetThumb}>
              <Text style={{ fontSize: 36 }}>{a.type === '角色' ? '👤' : a.type === '场景' ? '🏔️' : '⚔️'}</Text>
            </View>
            <Text style={s.assetName}>{a.name}</Text>
            <View style={s.assetBadge}>
              <Text style={s.assetBadgeText}>{a.type}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ==================== 我的 Tab ====================
function ProfileScreen() {
  return (
    <ScrollView style={s.screen}>
      <Text style={s.pageTitle}>👤 我的</Text>

      {/* User Card */}
      <View style={s.userCard}>
        <View style={s.userAvatar}><Text style={{ fontSize: 40 }}>🎬</Text></View>
        <Text style={s.userName}>Admin</Text>
        <Text style={s.userRole}>创作者</Text>
      </View>

      {/* Stats */}
      <View style={s.profileStats}>
        <View style={s.profileStat}>
          <Text style={s.profileStatNum}>15</Text>
          <Text style={s.profileStatLabel}>项目</Text>
        </View>
        <View style={s.profileStat}>
          <Text style={s.profileStatNum}>164</Text>
          <Text style={s.profileStatLabel}>分镜</Text>
        </View>
        <View style={s.profileStat}>
          <Text style={s.profileStatNum}>26</Text>
          <Text style={s.profileStatLabel}>视频</Text>
        </View>
      </View>

      {/* Menu */}
      {[
        { icon: '⚙️', label: '模型配置', desc: '管理 AI 模型和 API Key' },
        { icon: '💰', label: '成本控制', desc: '查看用量和预算' },
        { icon: '🎨', label: '风格管理', desc: '20+ 种 AI 风格' },
        { icon: '🔒', label: '安全设置', desc: '修改密码、权限' },
        { icon: '📊', label: '数据统计', desc: '生产报表' },
        { icon: '🌙', label: '深色模式', desc: '已开启' },
      ].map((item, i) => (
        <TouchableOpacity key={i} style={s.menuItem}>
          <Text style={s.menuIcon}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.menuLabel}>{item.label}</Text>
            <Text style={s.menuDesc}>{item.desc}</Text>
          </View>
          <Text style={s.menuArrow}>›</Text>
        </TouchableOpacity>
      ))}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ==================== 主 App ====================
export default function App() {
  const [tab, setTab] = useState('home');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" />
      {tab === 'home' && <HomeScreen onNavigate={setTab} />}
      {tab === 'create' && <CreateScreen />}
      {tab === 'projects' && <ProjectDetailScreen />}
      {tab === 'assets' && <AssetsScreen />}
      {tab === 'profile' && <ProfileScreen />}
      <TabBar active={tab} onTab={setTab} />
    </SafeAreaView>
  );
}

// ==================== Styles ====================
const s = StyleSheet.create({
  // Tab Bar
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: 20, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center' },
  tabIcon: { fontSize: 22, marginBottom: 2 },
  tabActive: { transform: [{ scale: 1.1 }] },
  tabLabel: { fontSize: 10, color: COLORS.textSec },

  // Screen
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 16 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSec, marginTop: 4 },
  avatarBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },

  // Quick Create
  quickCreate: { marginBottom: 20 },
  quickCreateBg: { backgroundColor: COLORS.accent + '20', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent + '40' },
  quickCreateIcon: { fontSize: 32, marginRight: 12 },
  quickCreateTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  quickCreateDesc: { fontSize: 12, color: COLORS.textSec, marginTop: 4 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 16, borderLeftWidth: 3 },
  statNum: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSec, marginTop: 4 },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  seeAll: { color: COLORS.accent, fontSize: 13 },

  // Project Card
  projectCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  projectThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: COLORS.accent + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  projectName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  projectMeta: { fontSize: 12, color: COLORS.textSec, marginTop: 2 },
  progressTrack: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  projectPercent: { fontSize: 14, fontWeight: '600', color: COLORS.accent, marginLeft: 8 },

  // Pipeline
  pipelineStage: { alignItems: 'center', marginRight: 16, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  pipelineDone: { backgroundColor: COLORS.success + '20' },
  pipelineCurrent: { backgroundColor: COLORS.warning + '20' },
  pipelinePending: { backgroundColor: COLORS.border + '60' },
  pipelineIcon: { fontSize: 20, marginBottom: 4 },
  pipelineLabel: { fontSize: 11, color: COLORS.textSec },

  // Create Screen
  inputSection: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  ideaInput: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, color: COLORS.text, fontSize: 15, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border },
  charCount: { textAlign: 'right', fontSize: 11, color: COLORS.textSec, marginTop: 4 },
  styleChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.card, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  styleChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  styleChipText: { fontSize: 13, color: COLORS.textSec },
  epRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  epBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  epBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  epBtnText: { fontSize: 14, color: COLORS.textSec, fontWeight: '600' },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: COLORS.card, marginRight: 8, marginBottom: 8 },
  typeChipText: { fontSize: 13, color: COLORS.textSec },
  generateBtn: { backgroundColor: COLORS.accent, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 10 },
  generateBtnDisabled: { opacity: 0.4 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  genRow: { flexDirection: 'row', alignItems: 'center' },

  // Progress
  progressSection: { marginTop: 20, backgroundColor: COLORS.card, borderRadius: 12, padding: 16 },
  progressStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border, marginRight: 12 },
  progressDotDone: { backgroundColor: COLORS.success },
  progressDotCurrent: { backgroundColor: COLORS.warning },
  progressText: { fontSize: 14, color: COLORS.textSec },

  // Project Detail
  projectDetailHeader: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginTop: 16 },
  projectDetailTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  projectDetailMeta: { fontSize: 13, color: COLORS.textSec, marginTop: 4, marginBottom: 12 },
  epTabs: { marginTop: 16, marginBottom: 8 },
  epTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  epTabActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  epTabText: { fontSize: 13, color: COLORS.textSec },

  // Content Tabs
  contentTabs: { flexDirection: 'row', marginVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  contentTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  contentTabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  contentTabText: { fontSize: 14, color: COLORS.textSec },

  // Script
  scriptView: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16 },
  scriptLine: { fontSize: 14, color: COLORS.text, lineHeight: 22, marginBottom: 8 },
  scriptBgm: { fontSize: 13, color: COLORS.accent, marginBottom: 6, fontStyle: 'italic' },
  scriptDialogue: { fontSize: 14, color: COLORS.warning, marginBottom: 6 },
  scriptAction: { fontSize: 13, color: COLORS.textSec, fontStyle: 'italic', marginBottom: 8 },

  // Storyboard
  storyboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shotCard: { width: (W - 42) / 2, backgroundColor: COLORS.card, borderRadius: 10, padding: 10 },
  shotThumb: { width: '100%', aspectRatio: 16 / 9, backgroundColor: COLORS.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  shotLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  shotDuration: { fontSize: 11, color: COLORS.textSec },

  // Video
  videoSection: { marginTop: 8 },
  videoPlayer: { width: '100%', aspectRatio: 16 / 9, backgroundColor: COLORS.card, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  videoDuration: { fontSize: 13, color: COLORS.textSec, marginTop: 8 },
  videoActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  videoBtn: { flex: 1, backgroundColor: COLORS.card, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  videoBtnText: { fontSize: 13, color: COLORS.textSec, fontWeight: '600' },
  videoTimeline: { flexDirection: 'row', gap: 4 },
  timelineBlock: { flex: 1, height: 32, backgroundColor: COLORS.accent + '30', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  timelineLabel: { fontSize: 10, color: COLORS.accentLight },

  // Assets
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterChipText: { fontSize: 13, color: COLORS.textSec },
  assetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  assetCard: { width: (W - 42) / 2, backgroundColor: COLORS.card, borderRadius: 12, padding: 12, alignItems: 'center' },
  assetThumb: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.accent + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  assetName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  assetBadge: { backgroundColor: COLORS.accent + '30', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  assetBadgeText: { fontSize: 10, color: COLORS.accentLight },

  // Profile
  userCard: { alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, padding: 24, marginBottom: 16 },
  userAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.accent + '30', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  userRole: { fontSize: 13, color: COLORS.textSec, marginTop: 4 },
  profileStats: { flexDirection: 'row', marginBottom: 16 },
  profileStat: { flex: 1, alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, paddingVertical: 16, marginHorizontal: 4 },
  profileStatNum: { fontSize: 24, fontWeight: '700', color: COLORS.accent },
  profileStatLabel: { fontSize: 12, color: COLORS.textSec, marginTop: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 8 },
  menuIcon: { fontSize: 24, marginRight: 14 },
  menuLabel: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  menuDesc: { fontSize: 12, color: COLORS.textSec, marginTop: 2 },
  menuArrow: { fontSize: 24, color: COLORS.textSec },
});
