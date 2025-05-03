from django.db import models

# Create your models here.

class Contact(models.Model):
    PRODUCT_CHOICES = [
        ('real', 'Classic Coca-Cola'),
        ('fanda', 'Sprite Series'),
        ('cococola', 'Fanta Series'),
    ]
    
    name = models.CharField('Name', max_length=100)
    email = models.EmailField('Email')
    phone = models.CharField('Phone', max_length=20)
    product = models.CharField('Product of Interest', max_length=20, choices=PRODUCT_CHOICES)
    quantity = models.IntegerField('Purchase Quantity', default=1)
    message = models.TextField('Message', blank=True)
    date_submitted = models.DateTimeField('Submission Date', auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.product} - {self.date_submitted.strftime('%Y-%m-%d')}"
    
    class Meta:
        verbose_name = 'Contact Form'
        verbose_name_plural = 'Contact Forms'
        ordering = ['-date_submitted']