FROM php:8.3-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git curl zip unzip libpng-dev libonig-dev libxml2-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy backend files
COPY backend/ /var/www/

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Copy frontend source and build
COPY frontend/ /var/www/frontend/
RUN cd /var/www/frontend && npm install && npm run build \
    && cp -r /var/www/frontend/dist/* /var/www/public/ \
    && rm -rf /var/www/frontend

# Setup permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www/storage \
    && chmod -R 755 /var/www/bootstrap/cache

EXPOSE 8080

# Run migrations first, then start the queue worker and the web server
CMD sh -c "php artisan storage:link && php artisan migrate --force && (php artisan queue:work --sleep=3 --tries=3 >/proc/1/fd/1 2>/proc/1/fd/2 &) && exec php artisan serve --host=0.0.0.0 --port=8080"
