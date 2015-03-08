from django.shortcuts import render

def index(request):
    context = {"USE_INSPECTLET": True}
    return render(request, 'home.html', context)
