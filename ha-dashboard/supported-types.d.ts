// this is an auto generated file, do not change this manually

import { ServiceFunction, ServiceFunctionTypes } from '@hakit/core';
declare module '@hakit/core' {
  export interface CustomSupportedServices<T extends ServiceFunctionTypes = 'target'> {
    persistentNotification: {
      // undefined
      create: ServiceFunction<
        object,
        T,
        {
          //  @example Please check your configuration.yaml.
          message: string;
          //  @example Test notification
          title?: string;
          //  @example 1234
          notification_id?: string;
        }
      >;
      // undefined
      dismiss: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          notification_id: string;
        }
      >;
      // undefined
      dismissAll: ServiceFunction<object, T, object>;
    };
    homeassistant: {
      // undefined
      savePersistentStates: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      stop: ServiceFunction<object, T, object>;
      // undefined
      restart: ServiceFunction<object, T, object>;
      // undefined
      checkConfig: ServiceFunction<object, T, object>;
      // undefined
      updateEntity: ServiceFunction<
        object,
        T,
        {
          //
          entity_id: string;
        }
      >;
      // undefined
      reloadCoreConfig: ServiceFunction<object, T, object>;
      // undefined
      setLocation: ServiceFunction<
        object,
        T,
        {
          //  @example 32.87336 @constraints  number: mode: box, min: -90, max: 90, step: any
          latitude: number;
          //  @example 117.22743 @constraints  number: mode: box, min: -180, max: 180, step: any
          longitude: number;
          //  @example 120 @constraints  number: mode: box, step: any
          elevation?: number;
        }
      >;
      // undefined
      reloadCustomTemplates: ServiceFunction<object, T, object>;
      // undefined
      reloadConfigEntry: ServiceFunction<
        object,
        T,
        {
          //  @constraints  config_entry:
          entry_id?: unknown;
        }
      >;
      // undefined
      reloadAll: ServiceFunction<object, T, object>;
    };
    logger: {
      // undefined
      setDefaultLevel: ServiceFunction<
        object,
        T,
        {
          //
          level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal' | 'critical';
        }
      >;
      // undefined
      setLevel: ServiceFunction<object, T, object>;
    };
    systemLog: {
      // undefined
      clear: ServiceFunction<object, T, object>;
      // undefined
      write: ServiceFunction<
        object,
        T,
        {
          //  @example Something went wrong
          message: string;
          //
          level?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
          //  @example mycomponent.myplatform
          logger?: string;
        }
      >;
    };
    frontend: {
      // undefined
      setTheme: ServiceFunction<
        object,
        T,
        {
          //  @example default
          name?: string;
          //  @example default
          name_dark?: string;
        }
      >;
      // undefined
      reloadThemes: ServiceFunction<object, T, object>;
    };
    recorder: {
      // undefined
      purge: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 365, unit_of_measurement: days, step: 1, mode: slider
          keep_days?: number;
          //  @constraints  boolean:
          repack?: boolean;
          //  @constraints  boolean:
          apply_filter?: boolean;
        }
      >;
      // undefined
      purgeEntities: ServiceFunction<
        object,
        T,
        {
          //
          entity_id?: string;
          //  @example sun @constraints  object: multiple: false
          domains?: object;
          //  @example domain*.object_id* @constraints  object: multiple: false
          entity_globs?: object;
          //  @constraints  number: min: 0, max: 365, unit_of_measurement: days, step: 1, mode: slider
          keep_days?: number;
        }
      >;
      // undefined
      enable: ServiceFunction<object, T, object>;
      // undefined
      disable: ServiceFunction<object, T, object>;
      // undefined
      getStatistics: ServiceFunction<
        object,
        T,
        {
          //  @example 2025-01-01 00:00:00 @constraints  datetime:
          start_time: string;
          //  @example 2025-01-02 00:00:00 @constraints  datetime:
          end_time?: string;
          //  @example sensor.energy_consumption,sensor.temperature @constraints  statistic: multiple: true
          statistic_ids: unknown;
          //  @example hour
          period: '5minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
          //  @example mean,sum
          types: 'change' | 'last_reset' | 'max' | 'mean' | 'min' | 'state' | 'sum';
          //  @example [object Object] @constraints  object: multiple: false
          units?: object;
        }
      >;
    };
    mediaPlayer: {
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      volumeUp: ServiceFunction<object, T, object>;
      // undefined
      volumeDown: ServiceFunction<object, T, object>;
      // undefined
      mediaPlayPause: ServiceFunction<object, T, object>;
      // undefined
      mediaPlay: ServiceFunction<object, T, object>;
      // undefined
      mediaPause: ServiceFunction<object, T, object>;
      // undefined
      mediaStop: ServiceFunction<object, T, object>;
      // undefined
      mediaNextTrack: ServiceFunction<object, T, object>;
      // undefined
      mediaPreviousTrack: ServiceFunction<object, T, object>;
      // undefined
      clearPlaylist: ServiceFunction<object, T, object>;
      // undefined
      volumeSet: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 1, step: 0.01, mode: slider
          volume_level: number;
        }
      >;
      // undefined
      volumeMute: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          is_volume_muted: boolean;
        }
      >;
      // undefined
      mediaSeek: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 9223372036854776000, step: 0.01, mode: box
          seek_position: number;
        }
      >;
      // undefined
      join: ServiceFunction<
        object,
        T,
        {
          //  @example - media_player.multiroom_player2 - media_player.multiroom_player3
          group_members: string[];
        }
      >;
      // undefined
      selectSource: ServiceFunction<
        object,
        T,
        {
          //  @example video1 @constraints  state: attribute: source, multiple: false
          source: unknown;
        }
      >;
      // undefined
      selectSoundMode: ServiceFunction<
        object,
        T,
        {
          //  @example Music @constraints  state: attribute: sound_mode, multiple: false
          sound_mode?: unknown;
        }
      >;
      // undefined
      playMedia: ServiceFunction<
        object,
        T,
        {
          //  @example {'media_content_id': 'https://home-assistant.io/images/cast/splash.png', 'media_content_type': 'music'} @constraints  media: multiple: false
          media: unknown;
          //
          enqueue?: 'play' | 'next' | 'add' | 'replace';
          //  @example true @constraints  boolean:
          announce?: boolean;
        }
      >;
      // undefined
      browseMedia: ServiceFunction<
        object,
        T,
        {
          //  @example music
          media_content_type?: string;
          //  @example A:ALBUMARTIST/Beatles
          media_content_id?: string | number;
        }
      >;
      // undefined
      searchMedia: ServiceFunction<
        object,
        T,
        {
          //  @example Beatles
          search_query: string;
          //  @example music
          media_content_type?: string;
          //  @example A:ALBUMARTIST/Beatles
          media_content_id?: string | number;
          //  @example album,artist
          media_filter_classes?: string;
        }
      >;
      // undefined
      shuffleSet: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          shuffle: boolean;
        }
      >;
      // undefined
      unjoin: ServiceFunction<object, T, object>;
      // undefined
      repeatSet: ServiceFunction<
        object,
        T,
        {
          //
          repeat: 'off' | 'all' | 'one';
        }
      >;
    };
    backup: {
      // undefined
      create: ServiceFunction<object, T, object>;
      // undefined
      createAutomatic: ServiceFunction<object, T, object>;
    };
    ffmpeg: {
      // undefined
      start: ServiceFunction<
        object,
        T,
        {
          //
          entity_id?: string;
        }
      >;
      // undefined
      stop: ServiceFunction<
        object,
        T,
        {
          //
          entity_id?: string;
        }
      >;
      // undefined
      restart: ServiceFunction<
        object,
        T,
        {
          //
          entity_id?: string;
        }
      >;
    };
    tts: {
      // undefined
      speak: ServiceFunction<
        object,
        T,
        {
          //
          media_player_entity_id: string;
          //  @example My name is hanna
          message: string;
          //  @constraints  boolean:
          cache?: boolean;
          //  @example ru
          language?: string;
          //  @example platform specific @constraints  object: multiple: false
          options?: object;
        }
      >;
      // undefined
      clearCache: ServiceFunction<object, T, object>;
      // Say something using text-to-speech on a media player with cloud.
      cloudSay: ServiceFunction<
        object,
        T,
        {
          //
          entity_id: string;
          //  @example My name is hanna
          message: string;
          //
          cache?: boolean;
          //  @example ru
          language?: string;
          //  @example platform specific
          options?: object;
        }
      >;
    };
    conversation: {
      // undefined
      process: ServiceFunction<
        object,
        T,
        {
          //  @example Turn all lights on
          text: string;
          //  @example NL
          language?: string;
          //  @example homeassistant @constraints  conversation_agent:
          agent_id?: string;
          //  @example my_conversation_1
          conversation_id?: string;
        }
      >;
      // undefined
      reload: ServiceFunction<
        object,
        T,
        {
          //  @example NL
          language?: string;
          //  @example homeassistant @constraints  conversation_agent:
          agent_id?: string;
        }
      >;
    };
    cloud: {
      // undefined
      remoteConnect: ServiceFunction<object, T, object>;
      // undefined
      remoteDisconnect: ServiceFunction<object, T, object>;
    };
    vacuum: {
      // undefined
      start: ServiceFunction<object, T, object>;
      // undefined
      pause: ServiceFunction<object, T, object>;
      // undefined
      returnToBase: ServiceFunction<object, T, object>;
      // undefined
      cleanSpot: ServiceFunction<object, T, object>;
      // undefined
      cleanArea: ServiceFunction<
        object,
        T,
        {
          //  @constraints  area: multiple: true, reorder: true
          cleaning_area_id: unknown;
        }
      >;
      // undefined
      locate: ServiceFunction<object, T, object>;
      // undefined
      stop: ServiceFunction<object, T, object>;
      // undefined
      setFanSpeed: ServiceFunction<
        object,
        T,
        {
          //  @example low @constraints  state: attribute: fan_speed, multiple: false
          fan_speed: unknown;
        }
      >;
      // undefined
      sendCommand: ServiceFunction<
        object,
        T,
        {
          //  @example set_dnd_timer
          command: string;
          //  @example { 'key': 'value' } @constraints  object: multiple: false
          params?: object;
        }
      >;
    };
    select: {
      // undefined
      selectFirst: ServiceFunction<object, T, object>;
      // undefined
      selectLast: ServiceFunction<object, T, object>;
      // undefined
      selectNext: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          cycle?: boolean;
        }
      >;
      // undefined
      selectOption: ServiceFunction<
        object,
        T,
        {
          //  @example 'Item A' @constraints  state: hide_states: unavailable,unknown, multiple: false
          option: unknown;
        }
      >;
      // undefined
      selectPrevious: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          cycle?: boolean;
        }
      >;
    };
    scene: {
      // undefined
      turnOn: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          transition?: number;
        }
      >;
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      apply: ServiceFunction<
        object,
        T,
        {
          //  @example light.kitchen: 'on' light.ceiling:   state: 'on'   brightness: 80  @constraints  object: multiple: false
          entities: object;
          //  @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          transition?: number;
        }
      >;
      // undefined
      create: ServiceFunction<
        object,
        T,
        {
          //  @example all_lights
          scene_id: string;
          //  @example light.tv_back_light: 'on' light.ceiling:   state: 'on'   brightness: 200  @constraints  object: multiple: false
          entities?: object;
          //  @example - light.ceiling - light.kitchen
          snapshot_entities?: string;
        }
      >;
      // undefined
      delete: ServiceFunction<object, T, object>;
    };
    lock: {
      // undefined
      unlock: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      lock: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      open: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
    };
    notify: {
      // undefined
      sendMessage: ServiceFunction<
        object,
        T,
        {
          //
          message: string;
          //
          title?: string;
        }
      >;
      // undefined
      persistentNotification: ServiceFunction<
        object,
        T,
        {
          //  @example The garage door has been open for 10 minutes.
          message: string;
          //  @example Your Garage Door Friend
          title?: string;
          //  @example platform specific @constraints  object: multiple: false
          data?: object;
        }
      >;
      // Sends a notification message using the notify service.
      notify: ServiceFunction<
        object,
        T,
        {
          //  @example The garage door has been open for 10 minutes.
          message: string;
          //  @example Your Garage Door Friend
          title?: string;
          //  @example platform specific
          target?: object;
          //  @example platform specific
          data?: object;
        }
      >;
    };
    remote: {
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<
        object,
        T,
        {
          //  @example BedroomTV
          activity?: string;
        }
      >;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      sendCommand: ServiceFunction<
        object,
        T,
        {
          //  @example 32756745
          device?: string;
          //  @example Play @constraints  object: multiple: false
          command: object;
          //  @constraints  number: min: 0, max: 255, step: 1, mode: slider
          num_repeats?: number;
          //  @constraints  number: min: 0, max: 60, step: 0.1, unit_of_measurement: seconds, mode: slider
          delay_secs?: number;
          //  @constraints  number: min: 0, max: 60, step: 0.1, unit_of_measurement: seconds, mode: slider
          hold_secs?: number;
        }
      >;
      // undefined
      learnCommand: ServiceFunction<
        object,
        T,
        {
          //  @example television
          device?: string;
          //  @example Turn on @constraints  object: multiple: false
          command?: object;
          //
          command_type?: 'ir' | 'rf';
          //  @constraints  boolean:
          alternative?: boolean;
          //  @constraints  number: min: 0, max: 60, step: 5, unit_of_measurement: seconds, mode: slider
          timeout?: number;
        }
      >;
      // undefined
      deleteCommand: ServiceFunction<
        object,
        T,
        {
          //  @example television
          device?: string;
          //  @example Mute @constraints  object: multiple: false
          command: object;
        }
      >;
    };
    cover: {
      // undefined
      openCover: ServiceFunction<
        object,
        T,
        {
          //  @example fast @constraints  state: attribute: speed, multiple: false
          speed?: unknown;
        }
      >;
      // undefined
      closeCover: ServiceFunction<
        object,
        T,
        {
          //  @example fast @constraints  state: attribute: speed, multiple: false
          speed?: unknown;
        }
      >;
      // undefined
      setCoverPosition: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          position: number;
          //  @example fast @constraints  state: attribute: speed, multiple: false
          speed?: unknown;
        }
      >;
      // undefined
      stopCover: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      openCoverTilt: ServiceFunction<object, T, object>;
      // undefined
      closeCoverTilt: ServiceFunction<object, T, object>;
      // undefined
      stopCoverTilt: ServiceFunction<object, T, object>;
      // undefined
      setCoverTiltPosition: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          tilt_position: number;
        }
      >;
      // undefined
      toggleCoverTilt: ServiceFunction<object, T, object>;
    };
    update: {
      // undefined
      install: ServiceFunction<
        object,
        T,
        {
          //  @example 1.0.0
          version?: string;
          //  @constraints  boolean:
          backup?: boolean;
        }
      >;
      // undefined
      skip: ServiceFunction<object, T, object>;
      // undefined
      clearSkipped: ServiceFunction<object, T, object>;
    };
    lawnMower: {
      // undefined
      startMowing: ServiceFunction<object, T, object>;
      // undefined
      pause: ServiceFunction<object, T, object>;
      // undefined
      dock: ServiceFunction<object, T, object>;
    };
    fan: {
      // undefined
      turnOn: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          percentage?: number;
          //  @example auto @constraints  state: attribute: preset_mode, multiple: false
          preset_mode?: unknown;
        }
      >;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      increaseSpeed: ServiceFunction<
        object,
        T,
        {
          //
          additional_fields?: object;
        }
      >;
      // undefined
      decreaseSpeed: ServiceFunction<
        object,
        T,
        {
          //
          additional_fields?: object;
        }
      >;
      // undefined
      oscillate: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          oscillating: boolean;
        }
      >;
      // undefined
      setDirection: ServiceFunction<
        object,
        T,
        {
          //
          direction: 'forward' | 'reverse';
        }
      >;
      // undefined
      setPercentage: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          percentage: number;
        }
      >;
      // undefined
      setPresetMode: ServiceFunction<
        object,
        T,
        {
          //  @example auto @constraints  state: attribute: preset_mode, multiple: false
          preset_mode: unknown;
        }
      >;
    };
    humidifier: {
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      setMode: ServiceFunction<
        object,
        T,
        {
          //  @example away @constraints  state: attribute: mode, multiple: false
          mode: unknown;
        }
      >;
      // undefined
      setHumidity: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          humidity: number;
        }
      >;
    };
    valve: {
      // undefined
      openValve: ServiceFunction<object, T, object>;
      // undefined
      closeValve: ServiceFunction<object, T, object>;
      // undefined
      setValvePosition: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          position: number;
        }
      >;
      // undefined
      stopValve: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
    };
    waterHeater: {
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      setAwayMode: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          away_mode: boolean;
        }
      >;
      // undefined
      setTemperature: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 250, step: 0.5, mode: box, unit_of_measurement: °
          temperature: number;
          //  @example eco @constraints  state: hide_states: unavailable,unknown, multiple: false
          operation_mode?: unknown;
        }
      >;
      // undefined
      setOperationMode: ServiceFunction<
        object,
        T,
        {
          //  @example eco @constraints  state: hide_states: unavailable,unknown, multiple: false
          operation_mode: unknown;
        }
      >;
    };
    camera: {
      // undefined
      enableMotionDetection: ServiceFunction<object, T, object>;
      // undefined
      disableMotionDetection: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      snapshot: ServiceFunction<
        object,
        T,
        {
          //  @example /tmp/snapshot_{{ entity_id.name }}.jpg
          filename: string;
        }
      >;
      // undefined
      playStream: ServiceFunction<
        object,
        T,
        {
          //
          media_player: string;
          //
          format?: 'hls';
        }
      >;
      // undefined
      record: ServiceFunction<
        object,
        T,
        {
          //  @example /tmp/snapshot_{{ entity_id.name }}.mp4
          filename: string;
          //  @constraints  number: min: 1, max: 3600, unit_of_measurement: seconds, step: 1, mode: slider
          duration?: number;
          //  @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          lookback?: number;
        }
      >;
    };
    button: {
      // undefined
      press: ServiceFunction<object, T, object>;
    };
    light: {
      // undefined
      turnOn: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          transition?: number;
          //  @example [255, 100, 100] @constraints  color_rgb:
          rgb_color?: [number, number, number];
          //  @constraints  color_temp: unit: kelvin, min: 2000, max: 6500
          color_temp_kelvin?: number;
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          brightness_pct?: number;
          //  @constraints  number: min: -100, max: 100, unit_of_measurement: %, step: 1, mode: slider
          brightness_step_pct?: number;
          //  @constraints  state: attribute: effect, multiple: false
          effect?: unknown;
          //
          additional_fields?: object;
        }
      >;
      // undefined
      turnOff: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          transition?: number;
          //
          additional_fields?: object;
        }
      >;
      // undefined
      toggle: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          transition?: number;
          //  @example [255, 100, 100] @constraints  color_rgb:
          rgb_color?: [number, number, number];
          //  @constraints  color_temp: unit: kelvin, min: 2000, max: 6500
          color_temp_kelvin?: number;
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          brightness_pct?: number;
          //  @constraints  state: attribute: effect, multiple: false
          effect?: unknown;
          //
          additional_fields?: object;
        }
      >;
    };
    alarmControlPanel: {
      // undefined
      alarmDisarm: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      alarmArmHome: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      alarmArmAway: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      alarmArmNight: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      alarmArmVacation: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      alarmArmCustomBypass: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      alarmTrigger: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
    };
    number: {
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @example 42
          value: string;
        }
      >;
    };
    switch: {
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
    };
    imageProcessing: {
      // undefined
      scan: ServiceFunction<object, T, object>;
    };
    zone: {
      // undefined
      reload: ServiceFunction<object, T, object>;
    };
    climate: {
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      setHvacMode: ServiceFunction<
        object,
        T,
        {
          //  @constraints  state: hide_states: unavailable,unknown, multiple: false
          hvac_mode?: unknown;
        }
      >;
      // undefined
      setPresetMode: ServiceFunction<
        object,
        T,
        {
          //  @example away @constraints  state: attribute: preset_mode, multiple: false
          preset_mode: unknown;
        }
      >;
      // undefined
      setTemperature: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 250, step: 0.1, mode: box
          temperature?: number;
          //
          temperature_range?: object;
          //  @constraints  state: hide_states: unavailable,unknown, multiple: false
          hvac_mode?: unknown;
        }
      >;
      // undefined
      setHumidity: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 30, max: 99, unit_of_measurement: %, step: 1, mode: slider
          humidity: number;
        }
      >;
      // undefined
      setFanMode: ServiceFunction<
        object,
        T,
        {
          //  @example low @constraints  state: attribute: fan_mode, multiple: false
          fan_mode: unknown;
        }
      >;
      // undefined
      setSwingMode: ServiceFunction<
        object,
        T,
        {
          //  @example on @constraints  state: attribute: swing_mode, multiple: false
          swing_mode: unknown;
        }
      >;
      // undefined
      setSwingHorizontalMode: ServiceFunction<
        object,
        T,
        {
          //  @example on @constraints  state: attribute: swing_horizontal_mode, multiple: false
          swing_horizontal_mode: unknown;
        }
      >;
    };
    logbook: {
      // undefined
      log: ServiceFunction<
        object,
        T,
        {
          //  @example Kitchen
          name: string;
          //  @example is being used
          message: string;
          //
          entity_id?: string;
          //  @example light
          domain?: string;
        }
      >;
    };
    inputSelect: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      selectFirst: ServiceFunction<object, T, object>;
      // undefined
      selectLast: ServiceFunction<object, T, object>;
      // undefined
      selectNext: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          cycle?: boolean;
        }
      >;
      // undefined
      selectOption: ServiceFunction<
        object,
        T,
        {
          //  @example 'Item A' @constraints  state: hide_states: unavailable,unknown, multiple: false
          option: unknown;
        }
      >;
      // undefined
      selectPrevious: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          cycle?: boolean;
        }
      >;
      // undefined
      setOptions: ServiceFunction<
        object,
        T,
        {
          //  @example ['Item A', 'Item B', 'Item C']
          options: string;
        }
      >;
    };
    inputButton: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      press: ServiceFunction<object, T, object>;
    };
    inputNumber: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 9223372036854776000, step: 0.001, mode: box
          value: number;
        }
      >;
      // undefined
      increment: ServiceFunction<object, T, object>;
      // undefined
      decrement: ServiceFunction<object, T, object>;
    };
    script: {
      //
      apriCancello: ServiceFunction<object, T, object>;
      //
      apriCancelletto: ServiceFunction<object, T, object>;
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
    };
    inputBoolean: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
    };
    timer: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      start: ServiceFunction<
        object,
        T,
        {
          //  @example 00:01:00 or 60 @constraints  duration: enable_second: true
          duration?: {
            hours?: number;
            days?: number;
            minutes?: number;
            seconds?: number;
          };
        }
      >;
      // undefined
      pause: ServiceFunction<object, T, object>;
      // undefined
      cancel: ServiceFunction<object, T, object>;
      // undefined
      finish: ServiceFunction<object, T, object>;
      // undefined
      change: ServiceFunction<
        object,
        T,
        {
          //  @example 00:01:00, 60 or -60 @constraints  duration: allow_negative: true, enable_second: true
          duration: {
            hours?: number;
            days?: number;
            minutes?: number;
            seconds?: number;
          };
        }
      >;
    };
    deviceTracker: {
      // undefined
      see: ServiceFunction<
        object,
        T,
        {
          //  @example FF:FF:FF:FF:FF:FF
          mac?: string;
          //  @example phonedave
          dev_id?: string;
          //  @example Dave
          host_name?: string;
          //  @example home
          location_name?: string;
          //  @example [51.509802, -0.086692] @constraints  object: multiple: false
          gps?: object;
          //  @constraints  number: min: 0, mode: box, unit_of_measurement: m, step: 1
          gps_accuracy?: number;
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          battery?: number;
        }
      >;
    };
    person: {
      // undefined
      reload: ServiceFunction<object, T, object>;
    };
    text: {
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @example Hello world!
          value: string;
        }
      >;
    };
    datetime: {
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @example 2023-10-07T21:35:22 @constraints  datetime:
          datetime: string;
        }
      >;
    };
    image: {
      // undefined
      snapshot: ServiceFunction<
        object,
        T,
        {
          //  @example /tmp/image_snapshot.jpg
          filename: string;
        }
      >;
    };
    siren: {
      // undefined
      turnOn: ServiceFunction<
        object,
        T,
        {
          //  @example fire
          tone?: string;
          //  @example 0.5 @constraints  number: min: 0, max: 1, step: 0.05, mode: slider
          volume_level?: number;
          //  @example 15
          duration?: string;
        }
      >;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
    };
    weather: {
      // undefined
      getForecasts: ServiceFunction<
        object,
        T,
        {
          //
          type: 'daily' | 'hourly' | 'twice_daily';
        }
      >;
    };
    time: {
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @example 22:15 @constraints  time:
          time: string;
        }
      >;
    };
    assistSatellite: {
      // undefined
      announce: ServiceFunction<
        object,
        T,
        {
          //  @example Time to wake up!
          message?: string;
          //  @constraints  media: accept: audio/*, multiple: false
          media_id?: unknown;
          //  @constraints  boolean:
          preannounce?: boolean;
          //  @constraints  media: accept: audio/*, multiple: false
          preannounce_media_id?: unknown;
        }
      >;
      // undefined
      startConversation: ServiceFunction<
        object,
        T,
        {
          //  @example You left the lights on in the living room. Turn them off?
          start_message?: string;
          //  @constraints  media: accept: audio/*, multiple: false
          start_media_id?: unknown;
          //
          extra_system_prompt?: string;
          //  @constraints  boolean:
          preannounce?: boolean;
          //  @constraints  media: accept: audio/*, multiple: false
          preannounce_media_id?: unknown;
        }
      >;
      // undefined
      askQuestion: ServiceFunction<
        object,
        T,
        {
          //
          entity_id: string;
          //  @example What kind of music would you like to play?
          question?: string;
          //  @constraints  media: accept: audio/*, multiple: false
          question_media_id?: unknown;
          //  @constraints  boolean:
          preannounce?: boolean;
          //  @constraints  media: accept: audio/*, multiple: false
          preannounce_media_id?: unknown;
          //  @constraints  object: label_field: sentences, description_field: id, multiple: true, translation_key: answers, fields: [object Object]
          answers?: object;
        }
      >;
    };
    aiTask: {
      // undefined
      generateData: ServiceFunction<
        object,
        T,
        {
          //  @example home summary
          task_name: string;
          //  @example Generate a funny notification that the garage door was left open
          instructions: string;
          //
          entity_id?: string;
          //  @example { 'name': { 'selector': { 'text': }, 'description': 'Name of the user', 'required': 'True' } } }, 'age': { 'selector': { 'number': }, 'description': 'Age of the user' } } @constraints  object: multiple: false
          structure?: object;
          //  @constraints  media: accept: *, multiple: true
          attachments?: unknown;
        }
      >;
      // undefined
      generateImage: ServiceFunction<
        object,
        T,
        {
          //  @example picture of a dog
          task_name: string;
          //  @example Generate a high quality square image of a dog on transparent background
          instructions: string;
          //
          entity_id: string;
          //  @constraints  media: accept: *, multiple: true
          attachments?: unknown;
        }
      >;
    };
    date: {
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @example 2022/11/01 @constraints  date:
          date: string;
        }
      >;
    };
    inputDatetime: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      setDatetime: ServiceFunction<
        object,
        T,
        {
          //  @example '2019-04-20'
          date?: string;
          //  @example '05:04:20' @constraints  time:
          time?: string;
          //  @example '2019-04-20 05:04:20'
          datetime?: string;
          //  @constraints  number: min: 0, max: 9223372036854776000, mode: box, step: 1
          timestamp?: number;
        }
      >;
    };
    shelly: {
      // undefined
      getKvsValue: ServiceFunction<
        object,
        T,
        {
          //
          device_id: string;
          //
          key: string;
        }
      >;
      // undefined
      setKvsValue: ServiceFunction<
        object,
        T,
        {
          //
          device_id: string;
          //
          key: string;
          //  @constraints  object: multiple: false
          value: object;
        }
      >;
    };
    counter: {
      // undefined
      increment: ServiceFunction<object, T, object>;
      // undefined
      decrement: ServiceFunction<object, T, object>;
      // undefined
      reset: ServiceFunction<object, T, object>;
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: -9223372036854776000, max: 9223372036854776000, mode: box, step: 1
          value: number;
        }
      >;
    };
    sonoff: {
      // Sends a command to a device.
      sendCommand: ServiceFunction<
        object,
        T,
        {
          // Device ID to send command to. @example 1000123456
          device?: object;
          // A single command to send. @example switch
          cmd?: object;
        }
      >;
    };
    inputText: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @example This is an example text
          value: string;
        }
      >;
    };
    schedule: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      getSchedule: ServiceFunction<object, T, object>;
    };
    file: {
      // undefined
      readFile: ServiceFunction<
        object,
        T,
        {
          //  @example www/my_file.json
          file_name?: string;
          //  @example JSON
          file_encoding?: 'JSON' | 'YAML';
        }
      >;
    };
    shoppingList: {
      // undefined
      addItem: ServiceFunction<
        object,
        T,
        {
          //  @example Beer
          name: string;
        }
      >;
      // undefined
      removeItem: ServiceFunction<
        object,
        T,
        {
          //  @example Beer
          name: string;
        }
      >;
      // undefined
      completeItem: ServiceFunction<
        object,
        T,
        {
          //  @example Beer
          name: string;
        }
      >;
      // undefined
      incompleteItem: ServiceFunction<
        object,
        T,
        {
          //  @example Beer
          name: string;
        }
      >;
      // undefined
      completeAll: ServiceFunction<object, T, object>;
      // undefined
      incompleteAll: ServiceFunction<object, T, object>;
      // undefined
      clearCompletedItems: ServiceFunction<object, T, object>;
      // undefined
      sort: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          reverse?: boolean;
        }
      >;
    };
    todo: {
      // undefined
      addItem: ServiceFunction<
        object,
        T,
        {
          //  @example Submit income tax return
          item: string;
          //  @example 2023-11-17 @constraints  date:
          due_date?: string;
          //  @example 2023-11-17 13:30:00 @constraints  datetime:
          due_datetime?: string;
          //  @example A more complete description of the to-do item than that provided by the summary.
          description?: string;
        }
      >;
      // undefined
      updateItem: ServiceFunction<
        object,
        T,
        {
          //  @example Submit income tax return
          item: string;
          //  @example Something else
          rename?: string;
          //  @example needs_action
          status?: 'needs_action' | 'completed';
          //  @example 2023-11-17 @constraints  date:
          due_date?: string;
          //  @example 2023-11-17 13:30:00 @constraints  datetime:
          due_datetime?: string;
          //  @example A more complete description of the to-do item than that provided by the summary.
          description?: string;
        }
      >;
      // undefined
      removeItem: ServiceFunction<
        object,
        T,
        {
          //  @example Submit income tax return
          item: string;
        }
      >;
      // undefined
      getItems: ServiceFunction<
        object,
        T,
        {
          //  @example needs_action
          status?: 'needs_action' | 'completed';
        }
      >;
      // undefined
      removeCompletedItems: ServiceFunction<object, T, object>;
    };
    automation: {
      // undefined
      trigger: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          skip_condition?: boolean;
        }
      >;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          stop_actions?: boolean;
        }
      >;
      // undefined
      reload: ServiceFunction<object, T, object>;
    };
  }
  export interface CustomEntityNameContainer {
    names:
      | 'conversation.home_assistant'
      | 'event.backup_automatic_backup'
      | 'sensor.backup_backup_manager_state'
      | 'sensor.backup_next_scheduled_automatic_backup'
      | 'sensor.backup_last_successful_automatic_backup'
      | 'sensor.backup_last_attempted_automatic_backup'
      | 'zone.home'
      | 'script.apri_cancello'
      | 'script.apri_cancelletto'
      | 'person.christianhouse'
      | 'sun.sun'
      | 'sensor.sun_next_dawn'
      | 'sensor.sun_next_dusk'
      | 'sensor.sun_next_midnight'
      | 'sensor.sun_next_noon'
      | 'sensor.sun_next_rising'
      | 'sensor.sun_next_setting'
      | 'weather.forecast_casa'
      | 'update.sonoff_lan_update'
      | 'update.hacs_update'
      | 'tts.google_translate_en_com'
      | 'media_player.27_smart_monitor_m5'
      | 'todo.lista_della_spesa'
      | 'automation.termosifoni_out'
      | 'automation.portone_ing_open'
      | 'automation.portone_ing_closed'
      | 'automation.porta_finestra_verandina_open'
      | 'automation.porta_finestra_verandina_closed'
      | 'automation.termosifoni_spegni_da_notifica'
      | 'automation.report_mensile_energia'
      | 'automation.citofono_ring_popup_e_notifica'
      | 'automation.citofono_azioni_notifica'
      | 'button.shelly1minig3_54320461a9d4_riavvia'
      | 'event.shelly1minig3_54320461a9d4_inserisci'
      | 'switch.shelly1minig3_54320461a9d4'
      | 'update.shelly1minig3_54320461a9d4_firmware'
      | 'binary_sensor.shelly1_244cab433f24_ingresso'
      | 'button.shelly1_244cab433f24_riavvia'
      | 'switch.shelly1_244cab433f24';
  }
}
