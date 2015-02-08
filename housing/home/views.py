from django.shortcuts import render

def home(request):
    context = {"USE_INSPECTLET": True}
    return render(request, 'home.html', context)
