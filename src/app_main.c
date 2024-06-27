/* Get Start Example

   This example code is in the Public Domain (or CC0 licensed, at your option.)

   Unless required by applicable law or agreed to in writing, this
   software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
   CONDITIONS OF ANY KIND, either express or implied.
*/

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"
#include "esp_system.h"
#include "esp_wifi.h"

#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(4, 4, 0)
#include "esp_mac.h"
#endif

#include "espnow.h"
#include "espnow_storage.h"
#include "espnow_utils.h"

#include "driver/uart.h"

#include "esp_sleep.h"

#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(4, 4, 0)
#include "esp_mac.h"
#endif

#include <driver/i2s.h>

#include "M5Atom.h"

// You can modify these according to your boards.
#define UART_BAUD_RATE 115200
#define UART_PORT_NUM 0
#define UART_TX_IO UART_PIN_NO_CHANGE
#define UART_RX_IO UART_PIN_NO_CHANGE

static const char *TAG = "combadge";


#define CONFIG_I2S_BCK_PIN     19
#define CONFIG_I2S_LRCK_PIN    33
#define CONFIG_I2S_DATA_PIN    22
#define CONFIG_I2S_DATA_IN_PIN 23

#define SPEAK_I2S_NUMBER I2S_NUM_0

#define MODE_MIC 0
#define MODE_SPK 1

bool InitI2SSpeakOrMic(int mode) {
    esp_err_t err = ESP_OK;

    i2s_driver_uninstall(SPEAK_I2S_NUMBER);
    i2s_config_t i2s_config = {
        .mode        = (i2s_mode_t)(I2S_MODE_MASTER),
        .sample_rate = 16000,
        .bits_per_sample =
            I2S_BITS_PER_SAMPLE_16BIT,  // is fixed at 12bit, stereo, MSB
        .channel_format = I2S_CHANNEL_FMT_ALL_RIGHT,
#if ESP_IDF_VERSION > ESP_IDF_VERSION_VAL(4, 1, 0)
        .communication_format =
            I2S_COMM_FORMAT_STAND_I2S,  // Set the format of the communication.
#else                                   // 设置通讯格式
        .communication_format = I2S_COMM_FORMAT_I2S,
#endif
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count    = 6,
        .dma_buf_len      = 60,
    };
    if (mode == MODE_MIC) {
        i2s_config.mode =
            (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX | I2S_MODE_PDM);
    } else {
        i2s_config.mode     = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX);
        i2s_config.use_apll = false;
        i2s_config.tx_desc_auto_clear = true;
    }

    ESP_LOGI(TAG, "Init i2s_driver_install");

    err += i2s_driver_install(SPEAK_I2S_NUMBER, &i2s_config, 0, NULL);
    i2s_pin_config_t tx_pin_config;

#if (ESP_IDF_VERSION > ESP_IDF_VERSION_VAL(4, 3, 0))
    tx_pin_config.mck_io_num = I2S_PIN_NO_CHANGE;
#endif
    tx_pin_config.bck_io_num   = CONFIG_I2S_BCK_PIN;
    tx_pin_config.ws_io_num    = CONFIG_I2S_LRCK_PIN;
    tx_pin_config.data_out_num = CONFIG_I2S_DATA_PIN;
    tx_pin_config.data_in_num  = CONFIG_I2S_DATA_IN_PIN;

    ESP_LOGI(TAG, "Init i2s_set_pin");
    err += i2s_set_pin(SPEAK_I2S_NUMBER, &tx_pin_config);
    ESP_LOGI(TAG, "Init i2s_set_clk");
    err += i2s_set_clk(SPEAK_I2S_NUMBER, 16000, I2S_BITS_PER_SAMPLE_16BIT,
                       I2S_CHANNEL_MONO);

    return true;
}




static void app_uart_read_task(void *arg) {
  esp_err_t ret = ESP_OK;
  uint32_t count = 0;
  size_t size = 0;
  uint8_t *data = ESP_CALLOC(1, ESPNOW_DATA_LEN);

  ESP_LOGI(TAG, "Uart read handle task is running");

  espnow_frame_head_t frame_head = {
      .retransmit_count = 5,
      .broadcast = true,
  };

  for (;;) {
    size = uart_read_bytes(UART_PORT_NUM, data, ESPNOW_DATA_LEN,
                           pdMS_TO_TICKS(10));
    ESP_ERROR_CONTINUE(size <= 0, "");

    ret = espnow_send(ESPNOW_DATA_TYPE_DATA, ESPNOW_ADDR_BROADCAST, data, size,
                      &frame_head, portMAX_DELAY);
    ESP_ERROR_CONTINUE(ret != ESP_OK, "<%s> espnow_send", esp_err_to_name(ret));

    ESP_LOGI(TAG, "espnow_send, count: %" PRIu32 ", size: %u, data: %s",
             count++, size, data);
    memset(data, 0, ESPNOW_DATA_LEN);
  }

  ESP_LOGI(TAG, "Uart handle task is exit");

  ESP_FREE(data);
  vTaskDelete(NULL);
}

static void app_uart_initialize() {
  uart_config_t uart_config = {
    .baud_rate = UART_BAUD_RATE,
    .data_bits = UART_DATA_8_BITS,
    .parity = UART_PARITY_DISABLE,
    .stop_bits = UART_STOP_BITS_1,
    .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
#if SOC_UART_SUPPORT_REF_TICK
    .source_clk = UART_SCLK_REF_TICK,
#elif SOC_UART_SUPPORT_XTAL_CLK
    .source_clk = UART_SCLK_XTAL,
#endif
  };

  ESP_ERROR_CHECK(uart_param_config(UART_PORT_NUM, &uart_config));
  ESP_ERROR_CHECK(uart_set_pin(UART_PORT_NUM, UART_TX_IO, UART_RX_IO,
                               UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));
  ESP_ERROR_CHECK(uart_driver_install(UART_PORT_NUM, 8 * ESPNOW_DATA_LEN,
                                      8 * ESPNOW_DATA_LEN, 0, NULL, 0));

  xTaskCreate(app_uart_read_task, "app_uart_read_task", 4 * 1024, NULL,
              tskIDLE_PRIORITY + 1, NULL);
}

static void app_wifi_init() {
  esp_event_loop_create_default();

  wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();

  ESP_ERROR_CHECK(esp_wifi_init(&cfg));
  ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
  ESP_ERROR_CHECK(esp_wifi_set_storage(WIFI_STORAGE_RAM));
  ESP_ERROR_CHECK(esp_wifi_set_ps(WIFI_PS_NONE));
  ESP_ERROR_CHECK(esp_wifi_start());
}

static esp_err_t app_uart_write_handle(uint8_t *src_addr, void *data,
                                       size_t size,
                                       wifi_pkt_rx_ctrl_t *rx_ctrl) {
  ESP_PARAM_CHECK(src_addr);
  ESP_PARAM_CHECK(data);
  ESP_PARAM_CHECK(size);
  ESP_PARAM_CHECK(rx_ctrl);

  static uint32_t count = 0;

  ESP_LOGI(TAG, "espnow_recv, <%" PRIu32 "> [" MACSTR "][%d][%d][%u]: %.*s",
           count++, MAC2STR(src_addr), rx_ctrl->channel, rx_ctrl->rssi, size,
           size, (char *)data);

  return ESP_OK;
}


#define CONTROL_KEY_GPIO      GPIO_NUM_39

static void app_switch_send_press_cb(void *arg, void *usr_data)
{
//    bool status = 0;

    ESP_ERROR_CHECK(!(BUTTON_SINGLE_CLICK == iot_button_get_event(arg)));

    ESP_LOGI(TAG, "switch send press");
//    espnow_storage_get(BULB_STATUS_KEY, &status, sizeof(status));
//    espnow_ctrl_initiator_send(ESPNOW_ATTRIBUTE_KEY_1, ESPNOW_ATTRIBUTE_POWER, status);
//    status = !status;
//    espnow_storage_set(BULB_STATUS_KEY, &status, sizeof(status));
}

static void app_switch_bind_press_cb(void *arg, void *usr_data)
{
    ESP_ERROR_CHECK(!(BUTTON_DOUBLE_CLICK == iot_button_get_event(arg)));

    ESP_LOGI(TAG, "switch bind press");
//    espnow_ctrl_initiator_bind(ESPNOW_ATTRIBUTE_KEY_1, true);
}

static void app_switch_unbind_press_cb(void *arg, void *usr_data)
{
    ESP_ERROR_CHECK(!(BUTTON_LONG_PRESS_START == iot_button_get_event(arg)));

    ESP_LOGI(TAG, "switch unbind press");
//    espnow_ctrl_initiator_bind(ESPNOW_ATTRIBUTE_KEY_1, false);
}


void app_main() {
  espnow_storage_init();

  app_uart_initialize();
  app_wifi_init();

  espnow_config_t espnow_config = ESPNOW_INIT_CONFIG_DEFAULT();
  espnow_init(&espnow_config);

  espnow_set_config_for_data_type(ESPNOW_DATA_TYPE_DATA, true,
                                  app_uart_write_handle);

  button_config_t button_config = {
      .type = BUTTON_TYPE_GPIO,
      .gpio_button_config =
          {
              .gpio_num = CONTROL_KEY_GPIO,
              .active_level = 0,
          },
  };


  button_handle_t button_handle = iot_button_create(&button_config);

  iot_button_register_cb(button_handle, BUTTON_SINGLE_CLICK,
                         app_switch_send_press_cb, NULL);
  iot_button_register_cb(button_handle, BUTTON_DOUBLE_CLICK,
                         app_switch_bind_press_cb, NULL);
  iot_button_register_cb(button_handle, BUTTON_LONG_PRESS_START,
                         app_switch_unbind_press_cb, NULL);
}
