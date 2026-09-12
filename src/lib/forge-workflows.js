// What to ask ComfyUI for. Both recipes follow ComfyUI's own published templates for
// these models, with the settings that were tested end to end.

// Wan was trained alongside this Chinese "avoid this" list; it works noticeably worse without it.
const WAN_NEGATIVE =
  '色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，' +
  'JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，' +
  '形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走';

const LTX_NEGATIVE = 'pc game, console game, video game, cartoon, childish, ugly';

export const MODELS = {
  wan: {
    name: 'Wan 2.2',
    blurb: 'Violent, gory action. Strong motion. No sound.',
    sizes: { '480p (faster)': 480, '720p (sharper)': 720 },
    multiple: 16,
    seconds: 5,
  },
  ltx: {
    name: 'LTX-2.5',
    blurb: 'Clips with sound: clashes, roars, wind, drums.',
    sizes: { '540p (faster)': 512, '720p (sharper)': 704 },
    multiple: 64, // its half-size first pass must stay a multiple of 32
    seconds: 5,
  },
};

export const SHAPES = {
  'Match my image': null,
  'Horizontal 16:9': [16, 9],
  'Vertical 9:16': [9, 16],
  Square: [1, 1],
};

/** Width and height for a shape and a short side, rounded to what the model needs. */
export function videoSize(shape, shortSide, imageWidth, imageHeight, multiple) {
  const ratio = SHAPES[shape] ?? [imageWidth, imageHeight];
  const [rw, rh] = ratio;
  let width, height;
  if (rw >= rh) {
    height = shortSide;
    width = (shortSide * rw) / rh;
  } else {
    width = shortSide;
    height = (shortSide * rh) / rw;
  }
  return [Math.round(width / multiple) * multiple, Math.round(height / multiple) * multiple];
}

export function wanWorkflow(prompt, imageName, width, height, seconds, seed) {
  const frames = 16 * seconds + 1;
  return {
    1: { class_type: 'CLIPLoader', inputs: { clip_name: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', type: 'wan', device: 'default' } },
    2: { class_type: 'UNETLoader', inputs: { unet_name: 'wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors', weight_dtype: 'default' } },
    3: { class_type: 'UNETLoader', inputs: { unet_name: 'wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors', weight_dtype: 'default' } },
    4: { class_type: 'LoraLoaderModelOnly', inputs: { model: ['2', 0], lora_name: 'wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors', strength_model: 1.0 } },
    5: { class_type: 'LoraLoaderModelOnly', inputs: { model: ['3', 0], lora_name: 'wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors', strength_model: 1.0 } },
    6: { class_type: 'ModelSamplingSD3', inputs: { model: ['4', 0], shift: 5.0 } },
    7: { class_type: 'ModelSamplingSD3', inputs: { model: ['5', 0], shift: 5.0 } },
    8: { class_type: 'VAELoader', inputs: { vae_name: 'wan_2.1_vae.safetensors' } },
    9: { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['1', 0] } },
    10: { class_type: 'CLIPTextEncode', inputs: { text: WAN_NEGATIVE, clip: ['1', 0] } },
    11: { class_type: 'LoadImage', inputs: { image: imageName } },
    12: { class_type: 'WanImageToVideo', inputs: { positive: ['9', 0], negative: ['10', 0], vae: ['8', 0], start_image: ['11', 0], width, height, length: frames, batch_size: 1 } },
    13: { class_type: 'KSamplerAdvanced', inputs: { model: ['6', 0], add_noise: 'enable', noise_seed: seed, steps: 4, cfg: 1.0, sampler_name: 'euler', scheduler: 'simple', positive: ['12', 0], negative: ['12', 1], latent_image: ['12', 2], start_at_step: 0, end_at_step: 2, return_with_leftover_noise: 'enable' } },
    14: { class_type: 'KSamplerAdvanced', inputs: { model: ['7', 0], add_noise: 'disable', noise_seed: seed, steps: 4, cfg: 1.0, sampler_name: 'euler', scheduler: 'simple', positive: ['12', 0], negative: ['12', 1], latent_image: ['13', 0], start_at_step: 2, end_at_step: 10000, return_with_leftover_noise: 'disable' } },
    15: { class_type: 'VAEDecode', inputs: { samples: ['14', 0], vae: ['8', 0] } },
    16: { class_type: 'CreateVideo', inputs: { images: ['15', 0], fps: 16 } },
    17: { class_type: 'SaveVideo', inputs: { video: ['16', 0], filename_prefix: 'icetear/wan', format: 'auto', codec: 'auto' } },
  };
}

export function ltxWorkflow(prompt, imageName, width, height, seconds, seed) {
  const frames = 24 * seconds + 1;
  const vae = { vae: ['3', 0] };
  return {
    1: { class_type: 'UNETLoader', inputs: { unet_name: 'ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors', weight_dtype: 'default' } },
    2: { class_type: 'CLIPLoader', inputs: { clip_name: 'gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors', type: 'ltxv', device: 'default' } },
    3: { class_type: 'VAELoader', inputs: { vae_name: 'ltx-2.5-video-vae-bf16.safetensors' } },
    4: { class_type: 'VAELoader', inputs: { vae_name: 'ltx-2.5-audio-vae-bf16.safetensors' } },
    5: { class_type: 'LatentUpscaleModelLoader', inputs: { model_name: 'ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors' } },
    6: { class_type: 'LoadImage', inputs: { image: imageName } },
    7: { class_type: 'LTXVPreprocess', inputs: { image: ['6', 0], img_compression: 18 } },
    8: { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['2', 0] } },
    9: { class_type: 'CLIPTextEncode', inputs: { text: LTX_NEGATIVE, clip: ['2', 0] } },
    10: { class_type: 'LTXVConditioning', inputs: { positive: ['8', 0], negative: ['9', 0], frame_rate: 24 } },
    // First pass at half size
    11: { class_type: 'EmptyLTXVLatentVideo', inputs: { width: Math.floor(width / 2), height: Math.floor(height / 2), length: frames, batch_size: 1 } },
    12: { class_type: 'LTXVImgToVideoInplace', inputs: { ...vae, image: ['7', 0], latent: ['11', 0], strength: 0.7, bypass: false } },
    13: { class_type: 'LTXVEmptyLatentAudio', inputs: { frames_number: frames, frame_rate: 24, batch_size: 1, audio_vae: ['4', 0] } },
    14: { class_type: 'LTXVConcatAVLatent', inputs: { video_latent: ['12', 0], audio_latent: ['13', 0] } },
    15: { class_type: 'LTXVDualCFGGuider', inputs: { model: ['1', 0], positive: ['10', 0], negative: ['10', 1], video_cfg: 1, audio_cfg: 1 } },
    16: { class_type: 'RandomNoise', inputs: { noise_seed: seed } },
    17: { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler_ancestral' } },
    18: { class_type: 'ManualSigmas', inputs: { sigmas: '1.0, 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0' } },
    19: { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['16', 0], guider: ['15', 0], sampler: ['17', 0], sigmas: ['18', 0], latent_image: ['14', 0] } },
    20: { class_type: 'LTXVSeparateAVLatent', inputs: { av_latent: ['19', 0] } },
    // Second pass: twice the size, then refined
    21: { class_type: 'LTXVLatentUpsampler', inputs: { samples: ['20', 0], upscale_model: ['5', 0], ...vae } },
    22: { class_type: 'LTXVImgToVideoInplace', inputs: { ...vae, image: ['7', 0], latent: ['21', 0], strength: 1.0, bypass: false } },
    23: { class_type: 'LTXVConcatAVLatent', inputs: { video_latent: ['22', 0], audio_latent: ['20', 1] } },
    24: { class_type: 'LTXVDualCFGGuider', inputs: { model: ['1', 0], positive: ['10', 0], negative: ['10', 1], video_cfg: 1, audio_cfg: 1 } },
    25: { class_type: 'RandomNoise', inputs: { noise_seed: 42 } },
    26: { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler_ancestral' } },
    27: { class_type: 'ManualSigmas', inputs: { sigmas: '0.85, 0.7250, 0.4219, 0.0' } },
    28: { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['25', 0], guider: ['24', 0], sampler: ['26', 0], sigmas: ['27', 0], latent_image: ['23', 0] } },
    29: { class_type: 'LTXVSeparateAVLatent', inputs: { av_latent: ['28', 0] } },
    30: { class_type: 'VAEDecodeTiled', inputs: { samples: ['29', 0], ...vae, tile_size: 512, overlap: 64, temporal_size: 64, temporal_overlap: 16 } },
    31: { class_type: 'LTXVAudioVAEDecode', inputs: { samples: ['29', 1], audio_vae: ['4', 0] } },
    32: { class_type: 'CreateVideo', inputs: { images: ['30', 0], audio: ['31', 0], fps: 24 } },
    33: { class_type: 'SaveVideo', inputs: { video: ['32', 0], filename_prefix: 'icetear/ltx', format: 'auto', codec: 'auto' } },
  };
}

export const WORKFLOWS = { wan: wanWorkflow, ltx: ltxWorkflow };
