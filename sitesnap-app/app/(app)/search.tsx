/**
 * Search Screen
 * Find any photo across all jobs. Search by job name, filter by type and date.
 * Design spec: Section 4.6
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
   View,
   Text,
   TextInput,
   Pressable,
   FlatList,
   RefreshControl,
   StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
   ChevronLeft,
   Search as SearchIcon,
   X,
   SearchX,
} from "lucide-react-native";
import { searchPhotos } from "@/lib/api";
import { PhotoThumbnail } from "@/components/PhotoThumbnail";
import { TypeFilterChips } from "@/components/TypeFilterChips";
import { SkeletonPhotoGrid } from "@/components/SkeletonLoader";
import { CLASSIFIABLE_TYPES, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { colors, spacing, radii, typography } from "@/lib/tokens";
import type { Photo, PhotoType } from "@/lib/types";

export default function SearchScreen() {
   const insets = useSafeAreaInsets();
   const router = useRouter();
   const inputRef = useRef<TextInput>(null);

   const [query, setQuery] = useState("");
   const [debouncedQuery, setDebouncedQuery] = useState("");
   const [activeFilters, setActiveFilters] = useState<string[]>([]);

   // Debounce search query
   useEffect(() => {
      const timer = setTimeout(() => {
         setDebouncedQuery(query);
      }, SEARCH_DEBOUNCE_MS);
      return () => clearTimeout(timer);
   }, [query]);

   // Auto-focus on mount
   useEffect(() => {
      setTimeout(() => inputRef.current?.focus(), 100);
   }, []);

   // Search query
   const {
      data: searchData,
      isLoading,
      isError,
      refetch,
      isRefetching,
   } = useQuery({
      queryKey: ["search", debouncedQuery, activeFilters],
      queryFn: () =>
         searchPhotos({
            q: debouncedQuery || undefined,
            type: activeFilters.length === 1
               ? (activeFilters[0] as PhotoType)
               : undefined,
            limit: 60,
         }),
      enabled: debouncedQuery.length > 0 || activeFilters.length > 0,
   });

   // Recent photos (when no search query)
   const { data: recentData } = useQuery({
      queryKey: ["search", "recent"],
      queryFn: () => searchPhotos({ limit: 12 }),
      enabled: debouncedQuery.length === 0 && activeFilters.length === 0,
   });

   const results = searchData?.photos ?? [];
   const recentPhotos = recentData?.photos ?? [];
   const hasQuery = debouncedQuery.length > 0 || activeFilters.length > 0;
   const photos = hasQuery ? results : recentPhotos;

   // Group results by job
   const groupedResults = useMemo(() => {
      if (!hasQuery) return null;
      const groups = new Map<
         string,
         { jobName: string; photos: (Photo & { jobName?: string })[] }
      >();
      for (const photo of results) {
         const jobName = (photo as Photo & { jobName?: string }).jobName ?? "Unknown Job";
         const existing = groups.get(photo.jobId);
         if (existing) {
            existing.photos.push(photo);
         } else {
            groups.set(photo.jobId, { jobName, photos: [photo] });
         }
      }
      return Array.from(groups.values());
   }, [results, hasQuery]);

   const handleFilterToggle = useCallback((type: string) => {
      setActiveFilters((prev) =>
         prev.includes(type)
            ? prev.filter((t) => t !== type)
            : [...prev, type],
      );
   }, []);

   // Type counts (not available in search, show all types)
   const typeCounts = useMemo(
      () =>
         CLASSIFIABLE_TYPES.map((type) => ({
            type,
            count: 0,
         })),
      [],
   );

   const handlePhotoPress = useCallback(
      (_photo: Photo) => {
         // TODO: Open full-screen photo viewer
      },
      [],
   );

   return (
      <View style={styles.screen}>
         {/* Header */}
         <View style={[styles.header, { paddingTop: insets.top }]}>
            <Pressable
               onPress={() => router.back()}
               style={styles.headerButton}
               accessibilityRole="button"
               accessibilityLabel="Go back"
               hitSlop={8}
            >
               <ChevronLeft
                  size={24}
                  color={colors.textSecondary}
                  strokeWidth={2}
               />
            </Pressable>
            <Text style={styles.headerTitle}>Search</Text>
            <View style={styles.headerButton} />
         </View>

         {/* Search input */}
         <View style={styles.searchContainer}>
            <View style={styles.searchInput}>
               <SearchIcon
                  size={20}
                  color={colors.textTertiary}
                  strokeWidth={2}
               />
               <TextInput
                  ref={inputRef}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search jobs..."
                  placeholderTextColor={colors.textTertiary}
                  style={styles.searchTextInput}
                  autoCapitalize="none"
                  returnKeyType="search"
                  accessibilityLabel="Search photos across all jobs"
               />
               {query.length > 0 && (
                  <Pressable
                     onPress={() => setQuery("")}
                     style={styles.clearButton}
                     accessibilityRole="button"
                     accessibilityLabel="Clear search"
                     hitSlop={8}
                  >
                     <X
                        size={20}
                        color={colors.textSecondary}
                        strokeWidth={2}
                     />
                  </Pressable>
               )}
            </View>
         </View>

         {/* Type filter chips */}
         <View style={styles.filtersRow}>
            <TypeFilterChips
               types={typeCounts}
               activeTypes={activeFilters}
               onToggle={handleFilterToggle}
               showAllChip={false}
            />
         </View>

         {/* Results */}
         {isLoading && (
            <View style={styles.gridPadding}>
               <SkeletonPhotoGrid />
            </View>
         )}

         {!isLoading && hasQuery && results.length === 0 && (
            <View style={styles.emptyState}>
               <SearchX
                  size={32}
                  color={colors.textTertiary}
                  strokeWidth={2}
               />
               <Text style={styles.emptyText}>
                  No photos match your search.
               </Text>
            </View>
         )}

         {/* Recent photos (no query) */}
         {!hasQuery && recentPhotos.length > 0 && (
            <FlatList
               data={recentPhotos}
               keyExtractor={(item) => item.id}
               numColumns={3}
               columnWrapperStyle={styles.gridRow}
               contentContainerStyle={styles.gridPadding}
               ListHeaderComponent={
                  <Text style={styles.sectionLabel}>Recent Photos</Text>
               }
               renderItem={({ item }) => (
                  <PhotoThumbnail
                     photo={item}
                     onPress={() => handlePhotoPress(item)}
                  />
               )}
               refreshControl={
                  <RefreshControl
                     refreshing={isRefetching}
                     onRefresh={() => refetch()}
                     tintColor={colors.accent}
                  />
               }
               contentInset={{ bottom: 100 }}
            />
         )}

         {/* Grouped search results */}
         {hasQuery && groupedResults && groupedResults.length > 0 && (
            <FlatList
               data={groupedResults}
               keyExtractor={(item) => item.jobName}
               renderItem={({ item: group }) => (
                  <View style={styles.resultGroup}>
                     <Text style={styles.groupJobName}>
                        {group.jobName}
                     </Text>
                     <View style={styles.grid}>
                        {group.photos.map((photo) => (
                           <PhotoThumbnail
                              key={photo.id}
                              photo={photo}
                              onPress={() => handlePhotoPress(photo)}
                           />
                        ))}
                     </View>
                  </View>
               )}
               refreshControl={
                  <RefreshControl
                     refreshing={isRefetching}
                     onRefresh={() => refetch()}
                     tintColor={colors.accent}
                  />
               }
               contentInset={{ bottom: 100 }}
            />
         )}
      </View>
   );
}

const styles = StyleSheet.create({
   screen: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
   },
   header: {
      flexDirection: "row",
      alignItems: "center",
      height: 56,
      backgroundColor: colors.bgElevated,
      paddingHorizontal: spacing.space2,
   },
   headerButton: {
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
   },
   headerTitle: {
      flex: 1,
      fontSize: typography.bodyLg.fontSize,
      fontWeight: "600",
      color: colors.textPrimary,
      textAlign: "center",
   },
   searchContainer: {
      paddingHorizontal: spacing.space4,
      paddingVertical: spacing.space3,
   },
   searchInput: {
      height: 52,
      backgroundColor: colors.bgInput,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.space4,
      gap: spacing.space2,
   },
   searchTextInput: {
      flex: 1,
      fontSize: typography.bodyLg.fontSize,
      color: colors.textPrimary,
      height: "100%",
   },
   clearButton: {
      width: 36,
      height: 36,
      justifyContent: "center",
      alignItems: "center",
   },
   filtersRow: {
      paddingVertical: spacing.space2,
   },
   gridPadding: {
      paddingHorizontal: spacing.space4,
   },
   gridRow: {
      gap: spacing.space1,
   },
   sectionLabel: {
      fontSize: typography.label.fontSize,
      fontWeight: typography.label.fontWeight,
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingVertical: spacing.space3,
   },
   emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.space3,
   },
   emptyText: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.textSecondary,
   },
   resultGroup: {
      paddingHorizontal: spacing.space4,
      marginBottom: spacing.space4,
   },
   groupJobName: {
      fontSize: typography.label.fontSize,
      fontWeight: typography.label.fontWeight,
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingTop: spacing.space4,
      paddingBottom: spacing.space2,
   },
   grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.space1,
   },
});
