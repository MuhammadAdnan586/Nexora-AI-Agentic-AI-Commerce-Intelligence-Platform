import time
import logging
from app.core.database import SessionLocal
from app.models.product import Product
from app.ml.forecasting import train_model_for_product

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger('worker')

RETRAIN_INTERVAL_SECONDS = 6 * 60 * 60  # every 6 hours


def retrain_all_products():
    db = SessionLocal()
    try:
        products = db.query(Product).filter(Product.is_active == True).all()
        logger.info(f'Starting retrain cycle for {len(products)} active products')
        for product in products:
            result = train_model_for_product(db, product.id)
            logger.info(f'Product {product.id} ({product.name}): {result["status"]}')
    except Exception as e:
        logger.error(f'Retrain cycle failed: {e}')
    finally:
        db.close()


if __name__ == '__main__':
    logger.info('Forecast retraining worker started')
    while True:
        retrain_all_products()
        logger.info(f'Sleeping for {RETRAIN_INTERVAL_SECONDS} seconds until next cycle')
        time.sleep(RETRAIN_INTERVAL_SECONDS)

