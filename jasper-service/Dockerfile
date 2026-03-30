FROM php:8.1-apache

# Enable Apache rewrite module
RUN a2enmod rewrite

# Install dependencies (minimal - Java optional for advanced JasperReports features)
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    wget \
    curl \
    libxml2-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    && docker-php-ext-install -j$(nproc) gd mysqli pdo pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . .

# Install PHP dependencies
RUN composer install --no-interaction --prefer-dist || true

# Set permissions
RUN chown -R www-data:www-data /var/www/html
RUN chmod -R 755 /var/www/html

# Create output directory
RUN mkdir -p /var/www/html/output && chmod 777 /var/www/html/output

EXPOSE 80

CMD ["apache2-foreground"]


