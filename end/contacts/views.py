from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .forms import ContactForm
from .models import Contact
import json

# Create your views here.

@csrf_exempt
def submit_contact(request):
    if request.method == 'POST':
        try:
            # Process JSON data
            if request.content_type == 'application/json':
                data = json.loads(request.body)
                form = ContactForm(data)
            # Process form data
            else:
                form = ContactForm(request.POST)
                
            if form.is_valid():
                form.save()
                return JsonResponse({'status': 'success', 'message': 'Your information has been successfully submitted, we will contact you as soon as possible!'})
            else:
                return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    
    return JsonResponse({'status': 'error', 'message': 'Only POST requests are accepted'}, status=405)