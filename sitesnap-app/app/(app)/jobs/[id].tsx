/**
 * Job Detail / Photo Timeline Screen
 * Shows all photos for a job in reverse-chronological order, grouped by date.
 * Design spec: Section 4.4
 */
import React, { useState, useCallback, useMemo } from "react";
import {
   View,
   Text,
   FlatList,
   Pressable,
   RefreshControl,
   Alert,
   ActionSheetIOS,
   StyleSheet,
   Platform,
   SectionList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
   ChevronLeft,
   MoreHorizontal,
   Camera,
   AlertCircle,
   Columns,
} from "lucide-react-native";
import {
   getJob,
   getPhotos,
   updateJob,
   deleteJob,
   updatePhoto,
} from "@/lib/api";
import { useSiteSnapStore } from "@/lib/store";
import { PhotoThumbnail, THUMBNAIL_SIZE } from "@/components/PhotoThumbnail";
import { TypeFilterChips } from "@/components/TypeFilterChips";
import { TypePicker } from "@/components/TypePicker";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonPhotoGrid } from "@/components/SkeletonLoader";
import { useToast } from "@/lib/toast-context";
import { groupPhotosByDate, pluralize } from "@/lib/utils";
import { retryUpload } from "@/lib/upload";
import { CLASSIFIABLE_TYPES } from "@/lib/constants";
import { colors, spacing, radii, typography } from "@/lib/tokens";
import type { Photo, PhotoType, ClassifiableType } from "@/lib/types";

export default function JobDetailScreen() {
   const { id } = useLocalSearchParams<{ id: string }>();
   const insets = useSafeAreaInsets();
   const router = useRouter();
   const queryClient = useQueryClient();
   const { showToast } = useToast();
   const activeJobId = useSiteSnapStore((s) => s.activeJobId);
   const setActiveJob = useSiteSnapStore((s) => s.setActiveJob);
   const uploadQueue = useSiteSnapStore((s) => s.uploadQueue);

   const [activeFilters, setActiveFilters] = useState<string[]>([]);
   const [isCompareMode, setIsCompareMode] = useState(false);
   const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
   const [typePickerPhoto, setTypePickerPhoto] = useState<Photo | null>(null);

   // Fetch job
   const { data: job } = useQuery({
      queryKey: ["job", id],
      queryFn: () => getJob(id),
      enabled: !!id,
   });

   // Fetch photos
   const {
      data: photosData,
      isLoading: photosLoading,
      isError: photosError,
      refetch,
      isRefetching,
   } = useQuery({
      queryKey: ["photos", id],
      queryFn: () => getPhotos(id, { limit: 100 }),
      enabled: !!id,
   });

   // Update photo type
   const updatePhotoMutation = useMutation({
      mutationFn: ({ photoId, type }: { photoId: string; type: string }) =>
         updatePhoto(photoId, { type }),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["photos", id] });
         showToast("Photo reclassified", "info");
      },
   });

   // Archive job
   const archiveMutation = useMutation({
      mutationFn: () => updateJob(id, { status: "archived" }),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["jobs"] });
         showToast("Job archived", "success");
         router.back();
      },
   });

   // Delete job
   const deleteMutation = useMutation({
      mutationFn: () => deleteJob(id),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["jobs"] });
         showToast("Job deleted", "success");
         router.back();
      },
   });

   // Compute upload items for this job
   const jobUploadItems = useMemo(
      () => uploadQueue.filter((item) => item.jobId === id),
      [uploadQueue, id],
   );

   // Combine real photos with upload queue items
   const allPhotos: Photo[] = useMemo(() => {
      const real = photosData?.photos ?? [];
      // Upload queue items appear as "virtual" photos at the top
      const virtual: Photo[] = jobUploadItems.map((item) => ({
         id: item.photoId,
         jobId: item.jobId,
         userId: "",
         r2Key: "",
         thumbnailR2Key: null,
         type: "pending" as PhotoType,
         confidence: null,
         scene: null,
         trade: null,
         width: item.width,
         height: item.height,
         sizeBytes: item.sizeBytes,
         takenAt: item.takenAt,
         createdAt: item.createdAt,
         thumbnailUrl: item.localUri,
      }));
      return [...virtual, ...real];
   }, [photosData, jobUploadItems]);

   // Apply filters
   const filteredPhotos = useMemo(() => {
      if (activeFilters.length === 0) return allPhotos;
      return allPhotos.filter((p) => activeFilters.includes(p.type));
   }, [allPhotos, activeFilters]);

   // Group by date
   const sections = useMemo(
      () => groupPhotosByDate(filteredPhotos),
      [filteredPhotos],
   );

   // Compute type counts for filter chips
   const typeCounts = useMemo(() => {
      const counts = new Map<string, number>();
      for (const p of allPhotos) {
         if (p.type === "pending") continue;
         counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
      }
      return CLASSIFIABLE_TYPES
         .map((type) => ({
            type,
            count: counts.get(type) ?? 0,
         }))
         .filter((t) => t.count > 0);
   }, [allPhotos]);

   const handleFilterToggle = useCallback((type: string) => {
      if (type === "all") {
         setActiveFilters([]);
         return;
      }
      setActiveFilters((prev) =>
         prev.includes(type)
            ? prev.filter((t) => t !== type)
            : [...prev, type],
      );
   }, []);

   const handleOverflowMenu = useCallback(() => {
      if (Platform.OS === "ios") {
         ActionSheetIOS.showActionSheetWithOptions(
            {
               options: [
                  "Cancel",
                  activeJobId === id
                     ? "Clear Active Job"
                     : "Set as Active Job",
                  "Compare Photos",
                  "Archive Job",
                  "Delete Job",
               ],
               destructiveButtonIndex: 4,
               cancelButtonIndex: 0,
            },
            (buttonIndex) => {
               switch (buttonIndex) {
                  case 1:
                     setActiveJob(activeJobId === id ? null : id);
                     showToast(
                        activeJobId === id
                           ? "Active job cleared"
                           : "Set as active job",
                        "success",
                     );
                     break;
                  case 2:
                     setIsCompareMode(true);
                     setSelectedPhotos([]);
                     break;
                  case 3:
                     Alert.alert(
                        "Archive this job?",
                        "You can find it in Archived Jobs.",
                        [
                           { text: "Cancel", style: "cancel" },
                           {
                              text: "Archive",
                              onPress: () => archiveMutation.mutate(),
                           },
                        ],
                     );
                     break;
                  case 4:
                     Alert.alert(
                        "Delete this job and all its photos?",
                        "This can't be undone.",
                        [
                           { text: "Cancel", style: "cancel" },
                           {
                              text: "Delete",
                              style: "destructive",
                              onPress: () => deleteMutation.mutate(),
                           },
                        ],
                     );
                     break;
               }
            },
         );
      }
   }, [
      id,
      activeJobId,
      setActiveJob,
      showToast,
      archiveMutation,
      deleteMutation,
   ]);

   const handlePhotoPress = useCallback(
      (photo: Photo) => {
         if (isCompareMode) {
            setSelectedPhotos((prev) => {
               if (prev.includes(photo.id)) {
                  return prev.filter((pId) => pId !== photo.id);
               }
               if (prev.length >= 2) return prev;
               return [...prev, photo.id];
            });
         }
         // TODO: Open full-screen photo viewer
      },
      [isCompareMode],
   );

   const handleLongPressBadge = useCallback((photo: Photo) => {
      setTypePickerPhoto(photo);
   }, []);

   const handleTypeSelect = useCallback(
      (type: ClassifiableType | "unclassified") => {
         if (!typePickerPhoto) return;
         updatePhotoMutation.mutate({
            photoId: typePickerPhoto.id,
            type,
         });
         setTypePickerPhoto(null);
      },
      [typePickerPhoto, updatePhotoMutation],
   );

   const handleGenerate = useCallback(() => {
      if (selectedPhotos.length === 2) {
         router.push({
            pathname: "/(app)/compare",
            params: {
               beforeId: selectedPhotos[0],
               afterId: selectedPhotos[1],
            },
         });
         setIsCompareMode(false);
         setSelectedPhotos([]);
      }
   }, [selectedPhotos, router]);

   const photoAddress = job?.address
      ? `${job.address} - ${pluralize(job?.photoCount ?? 0, "photo")}`
      : pluralize(job?.photoCount ?? 0, "photo");

   const renderPhoto = useCallback(
      ({ item }: { item: Photo }) => {
         const queueItem = jobUploadItems.find(
            (qi) => qi.photoId === item.id,
         );
         const isUploading =
            queueItem?.status === "pending" ||
            queueItem?.status === "uploading";
         const isFailed = queueItem?.status === "failed";

         const selectionIndex = selectedPhotos.indexOf(item.id);
         const selectionNumber =
            isCompareMode && selectionIndex >= 0
               ? selectionIndex + 1
               : null;

         return (
            <PhotoThumbnail
               photo={item}
               onPress={() => handlePhotoPress(item)}
               onLongPressBadge={() => handleLongPressBadge(item)}
               isUploading={isUploading}
               isFailed={isFailed}
               onRetry={() => retryUpload(item.id)}
               selectionNumber={selectionNumber}
            />
         );
      },
      [
         jobUploadItems,
         selectedPhotos,
         isCompareMode,
         handlePhotoPress,
         handleLongPressBadge,
      ],
   );

   const renderSectionHeader = useCallback(
      ({ section }: { section: { label: string } }) => (
         <Text style={styles.dateHeader}>{section.label}</Text>
      ),
      [],
   );

   return (
      <View style={styles.screen}>
         {/* Header */}
         <View style={[styles.header, { paddingTop: insets.top }]}>
            <Pressable
               onPress={() => {
                  if (isCompareMode) {
                     setIsCompareMode(false);
                     setSelectedPhotos([]);
                  } else {
                     router.back();
                  }
               }}
               style={styles.headerButton}
               accessibilityRole="button"
               accessibilityLabel={isCompareMode ? "Cancel selection" : "Go back"}
               hitSlop={8}
            >
               {isCompareMode ? (
                  <Text style={styles.cancelText}>Cancel</Text>
               ) : (
                  <ChevronLeft
                     size={24}
                     color={colors.textSecondary}
                     strokeWidth={2}
                  />
               )}
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
               {isCompareMode ? "Select Photos" : (job?.name ?? "")}
            </Text>
            {!isCompareMode && (
               <Pressable
                  onPress={handleOverflowMenu}
                  style={styles.headerButton}
                  accessibilityRole="button"
                  accessibilityLabel="More options"
                  hitSlop={8}
               >
                  <MoreHorizontal
                     size={24}
                     color={colors.textSecondary}
                     strokeWidth={2}
                  />
               </Pressable>
            )}
            {isCompareMode && <View style={styles.headerButton} />}
         </View>

         {/* Subheader */}
         <View style={styles.subHeader}>
            <Text style={styles.subHeaderText}>{photoAddress}</Text>
         </View>

         {/* Compare mode instruction */}
         {isCompareMode && (
            <View style={styles.compareInstruction}>
               <Text style={styles.compareInstructionText}>
                  Tap a BEFORE photo, then tap an AFTER photo
               </Text>
            </View>
         )}

         {/* Filter chips */}
         <View style={styles.filtersRow}>
            <TypeFilterChips
               types={typeCounts}
               activeTypes={activeFilters}
               onToggle={handleFilterToggle}
            />
         </View>

         {/* Photo grid */}
         {photosLoading && (
            <View style={styles.gridPadding}>
               <SkeletonPhotoGrid />
            </View>
         )}

         {photosError && !photosLoading && (
            <EmptyState
               icon={
                  <AlertCircle
                     size={32}
                     color={colors.statusError}
                     strokeWidth={2}
                  />
               }
               heading="Couldn't load photos."
               subtext="Pull to retry."
            />
         )}

         {!photosLoading && !photosError && filteredPhotos.length === 0 && activeFilters.length > 0 && (
            <View style={styles.filterEmpty}>
               <Text style={styles.filterEmptyText}>
                  No {activeFilters.join(", ")} photos in this job.
               </Text>
            </View>
         )}

         {!photosLoading && !photosError && allPhotos.length === 0 && (
            <EmptyState
               icon={
                  <Camera
                     size={48}
                     color={colors.textTertiary}
                     strokeWidth={2}
                  />
               }
               heading="No photos yet."
               subtext="Tap the camera button to start documenting this job."
            />
         )}

         {!photosLoading && !photosError && filteredPhotos.length > 0 && (
            <SectionList
               sections={sections.map((g) => ({
                  label: g.label,
                  data: [g.photos], // Wrap in array since we render a grid per section
               }))}
               keyExtractor={(_, index) => String(index)}
               renderSectionHeader={renderSectionHeader}
               renderItem={({ item: photos }) => (
                  <View style={styles.grid}>
                     {photos.map((photo: Photo) => (
                        <View key={photo.id}>{renderPhoto({ item: photo })}</View>
                     ))}
                  </View>
               )}
               refreshControl={
                  <RefreshControl
                     refreshing={isRefetching}
                     onRefresh={() => refetch()}
                     tintColor={colors.accent}
                  />
               }
               stickySectionHeadersEnabled={false}
               contentInset={{ bottom: 120 }}
            />
         )}

         {/* Compare generate button */}
         {isCompareMode && (
            <View style={styles.generateContainer}>
               <Pressable
                  onPress={handleGenerate}
                  disabled={selectedPhotos.length < 2}
                  style={({ pressed }) => [
                     styles.generateButton,
                     selectedPhotos.length >= 2
                        ? styles.generateButtonEnabled
                        : styles.generateButtonDisabled,
                     pressed &&
                        selectedPhotos.length >= 2 &&
                        styles.generateButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                     selectedPhotos.length < 2
                        ? "Select 2 photos"
                        : "Generate comparison"
                  }
               >
                  <Text
                     style={[
                        styles.generateButtonText,
                        selectedPhotos.length >= 2
                           ? styles.generateButtonTextEnabled
                           : styles.generateButtonTextDisabled,
                     ]}
                  >
                     {selectedPhotos.length < 2
                        ? "Select 2 Photos"
                        : "Generate Comparison"}
                  </Text>
               </Pressable>
            </View>
         )}

         {/* Type picker */}
         <TypePicker
            visible={typePickerPhoto !== null}
            currentType={typePickerPhoto?.type ?? "unclassified"}
            onSelect={handleTypeSelect}
            onDismiss={() => setTypePickerPhoto(null)}
         />
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
   cancelText: {
      fontSize: typography.body.fontSize,
      fontWeight: "500",
      color: colors.textSecondary,
   },
   subHeader: {
      paddingHorizontal: spacing.space4,
      paddingVertical: spacing.space2,
   },
   subHeaderText: {
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      color: colors.textSecondary,
   },
   compareInstruction: {
      backgroundColor: colors.accentMuted,
      marginHorizontal: spacing.space3,
      marginVertical: spacing.space2,
      borderRadius: radii.md,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
   },
   compareInstructionText: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.accent,
      textAlign: "center",
   },
   filtersRow: {
      paddingVertical: spacing.space2,
   },
   gridPadding: {
      paddingHorizontal: spacing.space4,
      paddingTop: spacing.space3,
   },
   dateHeader: {
      fontSize: typography.overline.fontSize,
      fontWeight: typography.overline.fontWeight,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: colors.textSecondary,
      paddingTop: spacing.space5,
      paddingBottom: spacing.space3,
      paddingHorizontal: spacing.space4,
   },
   grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.space1,
      paddingHorizontal: spacing.space4,
   },
   filterEmpty: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.space8,
   },
   filterEmptyText: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: colors.textSecondary,
      textAlign: "center",
   },
   generateContainer: {
      position: "absolute",
      bottom: 100,
      left: spacing.space8,
      right: spacing.space8,
   },
   generateButton: {
      height: 52,
      borderRadius: radii.md,
      justifyContent: "center",
      alignItems: "center",
   },
   generateButtonEnabled: {
      backgroundColor: colors.accent,
   },
   generateButtonDisabled: {
      backgroundColor: colors.bgHover,
   },
   generateButtonPressed: {
      backgroundColor: colors.accentHover,
      transform: [{ scale: 0.98 }],
   },
   generateButtonText: {
      fontSize: typography.bodyLg.fontSize,
      fontWeight: "600",
   },
   generateButtonTextEnabled: {
      color: colors.white,
   },
   generateButtonTextDisabled: {
      color: colors.textTertiary,
   },
});
