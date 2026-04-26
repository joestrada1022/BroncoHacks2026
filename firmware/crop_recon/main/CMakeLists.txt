idf_component_register(SRCS "crop_recon.cpp"
                       PRIV_REQUIRES spi_flash
                       REQUIRES esp_timer driver
                       INCLUDE_DIRS "")
