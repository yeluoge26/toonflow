// @db-hash 9e458e4b78c7a5d81c92e9d2e544f72c
//该文件由脚本自动生成，请勿手动修改

export interface t_aiModelMap {
  'configId'?: number | null;
  'configId2'?: number | null;
  'configId3'?: number | null;
  'id'?: number;
  'key'?: string | null;
  'name'?: string | null;
}
export interface t_artStyle {
  'id'?: number;
  'name'?: string | null;
  'styles'?: string | null;
}
export interface t_assets {
  'cameraMove'?: string | null;
  'dialogue'?: string | null;
  'duration'?: string | null;
  'durationMs'?: number | null;
  'episode'?: string | null;
  'filePath'?: string | null;
  'id'?: number;
  'intro'?: string | null;
  'locationRef'?: string | null;
  'name'?: string | null;
  'projectId'?: number | null;
  'prompt'?: string | null;
  'remark'?: string | null;
  'roleRefs'?: string | null;
  'scriptId'?: number | null;
  'segmentId'?: number | null;
  'shotIndex'?: number | null;
  'soundEffect'?: string | null;
  'state'?: string | null;
  'timeOfDay'?: string | null;
  'transition'?: string | null;
  'type'?: string | null;
  'videoPrompt'?: string | null;
}
export interface t_batch {
  'batchId'?: string | null;
  'config'?: string | null;
  'createdAt'?: number | null;
  'failCount'?: number | null;
  'id'?: number;
  'priority'?: string | null;
  'status'?: string | null;
  'successCount'?: number | null;
  'totalCount'?: number | null;
  'type'?: string | null;
  'updatedAt'?: number | null;
}
export interface t_character {
  'artStyle'?: string | null;
  'createdAt'?: number | null;
  'description'?: string | null;
  'embeddingId'?: string | null;
  'id'?: number;
  'isPublic'?: number | null;
  'loraId'?: string | null;
  'name': string;
  'personality'?: string | null;
  'projectId'?: number | null;
  'referenceImages'?: string | null;
  'stateHistory'?: string | null;
  'updatedAt'?: number | null;
  'voiceId'?: string | null;
}
export interface t_character_identity {
  'id'?: number;
  'projectId'?: number | null;
  'assetsId'?: number | null;
  'name'?: string | null;
  'faceDescription'?: string | null;
  'bodyType'?: string | null;
  'hairStyle'?: string | null;
  'clothingDefault'?: string | null;
  'colorPalette'?: string | null;
  'consistencySeed'?: number | null;
  'referenceImagePath'?: string | null;
  'loraModel'?: string | null;
  'ipAdapterWeight'?: number | null;
  'voiceType'?: string | null;
  'voiceEmotion'?: string | null;
  'voiceSpeed'?: number | null;
  'appearances'?: string | null;
  'createdAt'?: number | null;
  'updatedAt'?: number | null;
}
export interface t_chatHistory {
  'data'?: string | null;
  'id'?: number;
  'novel'?: string | null;
  'projectId'?: number | null;
  'type'?: string | null;
}
export interface t_config {
  'apiKey'?: string | null;
  'baseUrl'?: string | null;
  'createTime'?: number | null;
  'id'?: number;
  'manufacturer'?: string | null;
  'model'?: string | null;
  'modelType'?: string | null;
  'type'?: string | null;
  'userId'?: number | null;
}
export interface t_image {
  'assetsId'?: number | null;
  'filePath'?: string | null;
  'id'?: number;
  'projectId'?: number | null;
  'scriptId'?: number | null;
  'state'?: string | null;
  'type'?: string | null;
  'videoId'?: number | null;
}
export interface t_imageModel {
  'grid'?: number | null;
  'id'?: number;
  'manufacturer'?: string | null;
  'model'?: string | null;
  'type'?: string | null;
}
export interface t_metrics {
  'comments'?: number | null;
  'completionRate'?: number | null;
  'createdAt'?: number | null;
  'fetchedAt'?: number | null;
  'id'?: number;
  'likeRate'?: number | null;
  'likes'?: number | null;
  'platform'?: string | null;
  'postId'?: string | null;
  'projectId'?: number | null;
  'shares'?: number | null;
  'views'?: number | null;
}
export interface t_modelPricing {
  'currency'?: string | null;
  'id'?: number | null;
  'inputPrice'?: number | null;
  'manufacturer': string;
  'model': string;
  'outputPrice'?: number | null;
  'type'?: string | null;
  'unit'?: string | null;
  'updatedAt'?: number | null;
}
export interface t_modelUsage {
  'configId'?: number | null;
  'cost'?: number | null;
  'createdAt'?: number | null;
  'duration'?: number | null;
  'errorMsg'?: string | null;
  'id'?: number | null;
  'inputTokens'?: number | null;
  'manufacturer'?: string | null;
  'model'?: string | null;
  'moduleKey'?: string | null;
  'outputTokens'?: number | null;
  'status'?: string | null;
}
export interface t_novel {
  'chapter'?: string | null;
  'chapterData'?: string | null;
  'chapterIndex'?: number | null;
  'createTime'?: number | null;
  'id'?: number;
  'projectId'?: number | null;
  'reel'?: string | null;
}
export interface t_outline {
  'data'?: string | null;
  'episode'?: number | null;
  'id'?: number;
  'projectId'?: number | null;
  'version'?: number | null;
}
export interface t_pipelineTask {
  'batchId'?: string | null;
  'completedAt'?: number | null;
  'createdAt'?: number | null;
  'errorMsg'?: string | null;
  'id'?: number;
  'maxRetries'?: number | null;
  'payload'?: string | null;
  'priority'?: number | null;
  'projectId'?: number | null;
  'result'?: string | null;
  'retryCount'?: number | null;
  'startedAt'?: number | null;
  'status'?: string | null;
  'step'?: string | null;
  'taskId'?: string | null;
}
export interface t_project {
  'artStyle'?: string | null;
  'createTime'?: number | null;
  'id'?: number | null;
  'intro'?: string | null;
  'name'?: string | null;
  'type'?: string | null;
  'userId'?: number | null;
  'videoRatio'?: string | null;
}
export interface t_promptEvolution {
  'changeDetail'?: string | null;
  'childPromptId'?: string | null;
  'createdAt'?: number | null;
  'id'?: number;
  'parentPromptId'?: string | null;
  'type'?: string | null;
}
export interface t_promptGenome {
  'createdAt'?: number | null;
  'generation'?: number | null;
  'id'?: number;
  'parentId'?: string | null;
  'performanceScore'?: number | null;
  'promptId'?: string | null;
  'score'?: number | null;
  'status'?: string | null;
  'template'?: string | null;
  'usageCount'?: number | null;
  'variables'?: string | null;
}
export interface t_promptMetrics {
  'calculatedScore'?: number | null;
  'comments'?: number | null;
  'completionRate'?: number | null;
  'createdAt'?: number | null;
  'id'?: number;
  'likes'?: number | null;
  'projectId'?: number | null;
  'promptId'?: string | null;
  'shares'?: number | null;
  'views'?: number | null;
}
export interface t_prompts {
  'code'?: string | null;
  'customValue'?: string | null;
  'defaultValue'?: string | null;
  'id'?: number;
  'name'?: string | null;
  'parentCode'?: string | null;
  'type'?: string | null;
}
export interface t_scores {
  'audioScore'?: number | null;
  'conflictScore'?: number | null;
  'createdAt'?: number | null;
  'details'?: string | null;
  'emotionScore'?: number | null;
  'finalScore'?: number | null;
  'hookScore'?: number | null;
  'id'?: number;
  'label'?: string | null;
  'projectId'?: number | null;
  'visualScore'?: number | null;
}
export interface t_script {
  'content'?: string | null;
  'id'?: number;
  'name'?: string | null;
  'outlineId'?: number | null;
  'projectId'?: number | null;
  'version'?: number | null;
}
export interface t_setting {
  'id'?: number;
  'imageModel'?: string | null;
  'languageModel'?: string | null;
  'projectId'?: number | null;
  'tokenKey'?: string | null;
  'userId'?: number | null;
}
export interface t_storyline {
  'content'?: string | null;
  'id'?: number;
  'name'?: string | null;
  'novelIds'?: string | null;
  'projectId'?: number | null;
}
export interface t_taskQueue {
  'attempts'?: number | null;
  'completedAt'?: number | null;
  'createdAt'?: number | null;
  'errorReason'?: string | null;
  'id'?: number;
  'maxAttempts'?: number | null;
  'payload'?: string | null;
  'priority'?: number | null;
  'progress'?: number | null;
  'projectId'?: number | null;
  'result'?: string | null;
  'scriptId'?: number | null;
  'startedAt'?: number | null;
  'status'?: string | null;
  'type': string;
}
export interface t_template {
  'avgScore'?: number | null;
  'category'?: string | null;
  'createdAt'?: number | null;
  'id'?: number;
  'isBuiltin'?: number | null;
  'name'?: string | null;
  'promptTemplate'?: string | null;
  'structure'?: string | null;
  'successRate'?: number | null;
  'tags'?: string | null;
  'type'?: string | null;
  'updatedAt'?: number | null;
  'usageCount'?: number | null;
  'variables'?: string | null;
}
export interface t_templateRules {
  'category'?: string | null;
  'createdAt'?: number | null;
  'id'?: number;
  'name'?: string | null;
  'structure'?: string | null;
  'successRate'?: number | null;
  'tags'?: string | null;
  'usageCount'?: number | null;
}
export interface t_textModel {
  'id'?: number;
  'image'?: number | null;
  'manufacturer'?: string | null;
  'model'?: string | null;
  'responseFormat'?: string | null;
  'think'?: number | null;
  'tool'?: number | null;
}
export interface t_user {
  'id'?: number;
  'name'?: string | null;
  'password'?: string | null;
}
export interface t_variablePool {
  'createdAt'?: number | null;
  'id'?: number;
  'keyName'?: string | null;
  'score'?: number | null;
  'successCount'?: number | null;
  'usageCount'?: number | null;
  'value'?: string | null;
  'weight'?: number | null;
}
export interface t_video {
  'aiConfigId'?: number | null;
  'configId'?: number | null;
  'errorReason'?: string | null;
  'filePath'?: string | null;
  'firstFrame'?: string | null;
  'id'?: number;
  'model'?: string | null;
  'prompt'?: string | null;
  'resolution'?: string | null;
  'scriptId'?: number | null;
  'state'?: number | null;
  'storyboardImgs'?: string | null;
  'time'?: number | null;
}
export interface t_video_gen {
  'assetsId'?: number | null;
  'createdAt'?: number | null;
  'errorMsg'?: string | null;
  'id'?: number | null;
  'status'?: string | null;
  'taskId'?: string | null;
  'videoUrl'?: string | null;
}
export interface t_videoConfig {
  'aiConfigId'?: number | null;
  'audioEnabled'?: number | null;
  'createTime'?: number | null;
  'duration'?: number | null;
  'endFrame'?: string | null;
  'id'?: number;
  'images'?: string | null;
  'manufacturer'?: string | null;
  'mode'?: string | null;
  'projectId'?: number | null;
  'prompt'?: string | null;
  'resolution'?: string | null;
  'scriptId'?: number | null;
  'selectedResultId'?: number | null;
  'startFrame'?: string | null;
  'updateTime'?: number | null;
}
export interface t_video_constraints {
  'id'?: number;
  'projectId'?: number | null;
  'constraintType'?: string | null;
  'constraintKey'?: string | null;
  'constraintValue'?: string | null;
  'createdAt'?: number | null;
}
export interface t_videoModel {
  'aspectRatio'?: string | null;
  'audio'?: number | null;
  'durationResolutionMap'?: string | null;
  'id'?: number;
  'manufacturer'?: string | null;
  'model'?: string | null;
  'type'?: string | null;
}

export interface t_anti_drift_config {
  'id'?: number;
  'projectId'?: number | null;
  'configType'?: string | null;
  'configData'?: string | null;
  'enabled'?: number | null;
  'createdAt'?: number | null;
}
export interface t_viral_template {
  'id'?: number;
  'name'?: string | null;
  'category'?: string | null;
  'structure'?: string | null;
  'tags'?: string | null;
  'usageCount'?: number | null;
  'createdAt'?: number | null;
  'updatedAt'?: number | null;
}
export interface t_series {
  'id'?: number;
  'projectId'?: number | null;
  'name'?: string | null;
  'worldView'?: string | null;
  'sharedCharacters'?: string | null;
  'sharedScenes'?: string | null;
  'sharedStyle'?: string | null;
  'episodes'?: string | null;
  'seriesArc'?: string | null;
  'status'?: string | null;
  'createdAt'?: number | null;
}
export interface DB {
  "t_anti_drift_config": t_anti_drift_config;
  "t_aiModelMap": t_aiModelMap;
  "t_artStyle": t_artStyle;
  "t_assets": t_assets;
  "t_batch": t_batch;
  "t_character": t_character;
  "t_character_identity": t_character_identity;
  "t_chatHistory": t_chatHistory;
  "t_config": t_config;
  "t_image": t_image;
  "t_imageModel": t_imageModel;
  "t_metrics": t_metrics;
  "t_modelPricing": t_modelPricing;
  "t_modelUsage": t_modelUsage;
  "t_novel": t_novel;
  "t_outline": t_outline;
  "t_pipelineTask": t_pipelineTask;
  "t_project": t_project;
  "t_promptEvolution": t_promptEvolution;
  "t_promptGenome": t_promptGenome;
  "t_promptMetrics": t_promptMetrics;
  "t_prompts": t_prompts;
  "t_scores": t_scores;
  "t_script": t_script;
  "t_setting": t_setting;
  "t_storyline": t_storyline;
  "t_taskQueue": t_taskQueue;
  "t_template": t_template;
  "t_templateRules": t_templateRules;
  "t_textModel": t_textModel;
  "t_user": t_user;
  "t_variablePool": t_variablePool;
  "t_video": t_video;
  "t_video_gen": t_video_gen;
  "t_video_constraints": t_video_constraints;
  "t_videoConfig": t_videoConfig;
  "t_videoModel": t_videoModel;
  "t_viral_template": t_viral_template;
  "t_series": t_series;
}
