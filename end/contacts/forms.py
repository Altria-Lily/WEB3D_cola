from django import forms
from .models import Contact

class ContactForm(forms.ModelForm):
    class Meta:
        model = Contact
        fields = ['name', 'email', 'phone', 'product', 'quantity', 'message']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '请输入您的姓名'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': '请输入您的电子邮件'}),
            'phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '请输入您的电话号码'}),
            'product': forms.Select(attrs={'class': 'form-control'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control', 'min': 1}),
            'message': forms.Textarea(attrs={'class': 'form-control', 'placeholder': '请输入您的留言', 'rows': 4}),
        } 