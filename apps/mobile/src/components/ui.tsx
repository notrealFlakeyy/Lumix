import { Link, usePathname } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const palette = {
  background: '#f7efe4',
  backgroundAccent: '#efe1cf',
  ink: '#19263f',
  inkSoft: '#51607c',
  card: '#fff9f1',
  cardAlt: '#f2e5d5',
  cardBorder: '#eadbc7',
  hero: '#16233c',
  heroMuted: '#c8d0de',
  primary: '#f47f5a',
  primaryPressed: '#db6b49',
  secondary: '#d7eadf',
  secondaryInk: '#1f4a3b',
  ghostBorder: '#d7c7b2',
  white: '#ffffff',
  danger: '#af2f2f',
}

type ScreenProps = {
  children: React.ReactNode
  showDock?: boolean
}

export function Screen({ children, showDock = false }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.backdropTop} />
      <View pointerEvents="none" style={styles.backdropSide} />
      <ScrollView
        contentContainerStyle={[styles.screen, showDock && styles.screenWithDock]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {showDock ? <MobileDock /> : null}
    </SafeAreaView>
  )
}

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  )
}

export function HeroCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroGlowOne} />
      <View style={styles.heroGlowTwo} />
      {eyebrow ? <Text style={styles.heroEyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
      {children ? <View style={styles.heroBody}>{children}</View> : null}
    </View>
  )
}

export function AppText({
  children,
  muted = false,
  strong = false,
  danger = false,
}: {
  children: React.ReactNode
  muted?: boolean
  strong?: boolean
  danger?: boolean
}) {
  return <Text style={[styles.text, muted && styles.textMuted, strong && styles.textStrong, danger && styles.textDanger]}>{children}</Text>
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>
}

export function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor="#8e7f6f" style={styles.input} {...props} />
}

export function Button({
  title,
  onPress,
  disabled,
  variant = 'primary',
}: {
  title: string
  onPress?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        pressed && variant === 'primary' && styles.buttonPrimaryPressed,
        (pressed || disabled) && styles.buttonPressed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.buttonTextSecondary,
          variant === 'ghost' && styles.buttonTextGhost,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  )
}

export function StatCard({
  label,
  value,
  tone = 'light',
}: {
  label: string
  value: string
  tone?: 'light' | 'dark' | 'mint'
}) {
  return (
    <View style={[styles.statCard, tone === 'dark' && styles.statCardDark, tone === 'mint' && styles.statCardMint]}>
      <Text style={[styles.statLabel, tone !== 'light' && styles.statLabelDark]}>{label}</Text>
      <Text style={[styles.statValue, tone !== 'light' && styles.statValueDark]}>{value}</Text>
    </View>
  )
}

export function ListCard({
  title,
  subtitle,
  right,
  tone = 'default',
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  tone?: 'default' | 'accent'
}) {
  return (
    <View style={[styles.listCard, tone === 'accent' && styles.listCardAccent]}>
      <View style={styles.listCardBody}>
        <Text style={styles.listCardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listCardSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.listCardRight}>{right}</View> : null}
    </View>
  )
}

export function Badge({
  label,
  tone = 'ink',
}: {
  label: string
  tone?: 'ink' | 'accent' | 'success'
}) {
  return <Text style={[styles.badge, tone === 'accent' && styles.badgeAccent, tone === 'success' && styles.badgeSuccess]}>{label}</Text>
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
    </View>
  )
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator color={palette.primary} />
      <Text style={styles.sectionSubtitle}>{label}</Text>
    </View>
  )
}

function MobileDock() {
  const pathname = usePathname()
  const items = [
    { href: '/(app)/home', label: 'Home', active: pathname === '/(app)/home' || pathname === '/home' },
    { href: '/(app)/trips', label: 'Trips', active: pathname.includes('/trips') },
    { href: '/(app)/documents', label: 'Docs', active: pathname.includes('/documents') },
    { href: '/(app)/time', label: 'Time', active: pathname.includes('/time') },
  ] as const

  return (
    <View style={styles.dockWrap}>
      <View style={styles.dock}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} asChild>
            <Pressable style={[styles.dockItem, item.active && styles.dockItemActive]}>
              <Text style={[styles.dockLabel, item.active && styles.dockLabelActive]}>{item.label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  )
}

export const uiStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stack: { gap: 12 },
  split: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
})

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  backdropTop: {
    position: 'absolute',
    top: -60,
    right: -20,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: palette.backgroundAccent,
    opacity: 0.8,
  },
  backdropSide: {
    position: 'absolute',
    top: 160,
    left: -80,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#f3dcc7',
    opacity: 0.55,
  },
  screen: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 22,
  },
  screenWithDock: {
    paddingBottom: 120,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    gap: 4,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    color: palette.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 28,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    shadowColor: '#8f7458',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroCard: {
    overflow: 'hidden',
    backgroundColor: palette.hero,
    borderRadius: 30,
    padding: 22,
    gap: 10,
    minHeight: 190,
  },
  heroGlowOne: {
    position: 'absolute',
    top: -24,
    right: -10,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#f48d68',
    opacity: 0.2,
  },
  heroGlowTwo: {
    position: 'absolute',
    bottom: -36,
    left: -18,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#8dc8a7',
    opacity: 0.18,
  },
  heroEyebrow: {
    color: '#f8ccb8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: palette.white,
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroSubtitle: {
    color: palette.heroMuted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: '92%',
  },
  heroBody: {
    marginTop: 8,
    gap: 12,
  },
  text: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  textMuted: {
    color: palette.inkSoft,
  },
  textStrong: {
    fontWeight: '700',
  },
  textDanger: {
    color: palette.danger,
  },
  label: {
    color: '#5c4f44',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: palette.ink,
    backgroundColor: '#fffdf8',
    fontSize: 15,
  },
  button: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: palette.primary,
  },
  buttonPrimaryPressed: {
    backgroundColor: palette.primaryPressed,
  },
  buttonSecondary: {
    backgroundColor: palette.secondary,
  },
  buttonGhost: {
    backgroundColor: '#fff6eb',
    borderWidth: 1,
    borderColor: palette.ghostBorder,
  },
  buttonPressed: {
    opacity: 0.76,
  },
  buttonText: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  buttonTextSecondary: {
    color: palette.secondaryInk,
  },
  buttonTextGhost: {
    color: palette.ink,
  },
  statCard: {
    flexGrow: 1,
    minWidth: 132,
    backgroundColor: '#fff5e9',
    borderRadius: 22,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
  statCardDark: {
    backgroundColor: '#243454',
    borderColor: '#314568',
  },
  statCardMint: {
    backgroundColor: '#d9ece2',
    borderColor: '#c8dfd4',
  },
  statLabel: {
    fontSize: 12,
    color: '#8a6e54',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    fontWeight: '700',
  },
  statLabelDark: {
    color: '#b8c4d8',
  },
  statValue: {
    fontSize: 28,
    color: palette.ink,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  statValueDark: {
    color: palette.white,
  },
  listCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#fff6ec',
    borderWidth: 1,
    borderColor: palette.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
  },
  listCardAccent: {
    backgroundColor: '#eef6f1',
    borderColor: '#d3e4da',
  },
  listCardBody: {
    flex: 1,
    gap: 5,
  },
  listCardRight: {
    justifyContent: 'center',
  },
  listCardTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  listCardSubtitle: {
    color: palette.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ecdfd1',
    color: palette.ink,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  badgeAccent: {
    backgroundColor: '#ffd9cb',
    color: '#8a341b',
  },
  badgeSuccess: {
    backgroundColor: '#d8ecdf',
    color: '#235141',
  },
  emptyState: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    backgroundColor: '#fff7ef',
    padding: 18,
    gap: 8,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyDetail: {
    color: palette.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingState: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(22, 35, 60, 0.94)',
    width: '92%',
    shadowColor: '#17253e',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  dockItem: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockItemActive: {
    backgroundColor: palette.primary,
  },
  dockLabel: {
    color: '#c7d0df',
    fontSize: 13,
    fontWeight: '700',
  },
  dockLabelActive: {
    color: palette.white,
  },
})
