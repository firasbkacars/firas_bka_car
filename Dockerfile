FROM php:8.3-cli

# Install system dependencies
# GD doit pouvoir decoder JPEG et WebP : la verification automatique des
# photos de permis / CIN / passeport en depend en production.
RUN apt-get update && apt-get install -y \
    git curl zip unzip libpng-dev libjpeg-dev libfreetype6-dev libwebp-dev libonig-dev libxml2-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Les photos de documents peuvent peser jusqu'a 5 Mo : sans ces limites PHP
# rejetterait silencieusement les fichiers des 2 Mo (valeur par defaut).
RUN printf "upload_max_filesize=6M\npost_max_size=8M\nmemory_limit=512M\nmax_execution_time=60\n" \
    > /usr/local/etc/php/conf.d/firas-uploads.ini

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

# Run migrations first, then start the queue worker, the scheduler and the web server.
# schedule:work execute reservations:reminders, permis:verifier et vehicules:contrats chaque minute
# (les taches sont cadencees via routes/console.php).
CMD sh -c "php artisan storage:link && php artisan migrate --force && (php artisan queue:work --sleep=3 --tries=3 >/proc/1/fd/1 2>/proc/1/fd/2 &) && (php artisan schedule:work >/proc/1/fd/1 2>/proc/1/fd/2 &) && exec php artisan serve --host=0.0.0.0 --port=8080"
